// ==UserScript==
// @name         HITWH抢课脚本
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  哈工大威海新教务系统抢课脚本，模拟抢课手动操作，仅供学习交流使用，不得用于商业用途，如有侵权请联系删除
// @author       Ling-yunchi
// @match        http://172.26.64.16/loginCAS*
// @match        http://172-26-64-16.ivpn.hitwh.edu.cn:8118/loginCAS*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    let panel = `
    <div id="panel" style="position: fixed; top: 400px;right:0;z-index: 100;width: 300px;display:flex;flex-direction:column;align-items: center;background-color: rgba(0,0,0,0.5); padding: 10px">
    <div style="color: white; font-size: 2rem">HITWH抢课脚本</div>
    <div style="color: #ff5050; font-size: 1.5rem">
        <p>本脚本仅模拟手动操作</p>
        <p>选课时注意关掉浏览器弹出的成功或失败提示</p>
        <p>否则将会卡住，无法选择其他的课程</p>
        <p>选课时可以打开开发者工具查看选课日志</p>
    </div>
    <div style="display: flex;flex-direction: column;">
        <select id="type" style="margin-bottom: 5px">
            <option value="2">英语</option>
            <option value="3">体育</option>
            <option value="4">文化素质核心</option>
            <option value="5">创新研修</option>
            <option value="6">创新实验</option>
            <option value="7">创新创业</option>
            <option value="8">未来技术学院课程</option>
            <option value="9">外专业课程</option>
        </select>
        <input style="width: 200px; margin-bottom: 5px" type="text" id="courses" placeholder="课程序号，多门课使用逗号分隔">
        <input type="button" id="start" value="开始">
    </div>
    </div>
    `
    $(document).ready(function () {
        // 添加面板
        $("body").append(panel);
        // 使用鼠标上下拖动面板
        $("#panel").mousedown(function (e) {
            let offset = $(this).offset();
            let x = e.pageX - offset.left;
            let y = e.pageY - offset.top;
            $(document).bind("mousemove", function (ev) {
                $("#panel").stop();
                let _x = ev.pageX - x;
                let _y = ev.pageY - y;
                $("#panel").animate({ left: _x + "px", top: _y + "px" }, 10);
            });
        });
        $(document).mouseup(function () {
            $(this).unbind("mousemove");
        });



        let type = 0;
        let courses = [];
        let courseIndex = 0;
        let nowPage = 1;
        let statue = "stop";
        /**
         * 运用了状态机的思想来解决iframe的加载问题
         * 
         * statue: init, wait, select, end, stop
         *  stop: 停止（初始状态）
         *  init: 初始化，加载页面
         *  wait: 等待（不断刷新，等待选课）
         *  select: 选课
         *  end: 结束
         */

        let iframe = $("#iframename");
        iframe.load(() => {
            const iframeWin = iframe[0].contentWindow;
            const iframeDoc = iframe[0].contentDocument;
            while (true) {
                console.log(`statue: ${statue}, nowPage: ${nowPage}, courseIndex: ${courseIndex}`);
                switch (statue) {
                    default:
                        return;
                    case "init":
                        statue = "wait";
                        iframeWin.queryLike();
                        return;
                    case "wait":
                        let warn = $("body > div.Contentbox > div > div.Menubox > table > tbody > tr > td:nth-child(2) > span", iframeDoc)
                        if (warn.length > 0) {
                            console.log("不可选课，刷新");
                            iframeWin.queryLike();
                            return;
                        } else {
                            console.log("可选课，开始选课");
                            statue = "select";
                            courseIndex = 0;
                        }
                        break;
                    case "select":
                        if (courseIndex >= courses.length) {
                            statue = "end";
                            return;
                        }
                        let course = courses[courseIndex];
                        console.log("选课：" + course);
                        let page = Math.ceil(course / 20);
                        let index = (course - 1) % 20 + 1;
                        if (index === 0) {
                            console.log("选课序号为0，错误")
                            courseIndex++;
                            break;
                        }
                        if (page !== nowPage) {
                            let pageSelector = $("body > div.Contentbox > div > div.youtube > ul", iframeDoc);
                            if (page + 1 >= pageSelector.children().length - 2) {
                                console.log(`翻页${page}错误，页码超出范围，跳过课程${course}的选课`);
                            } else {
                                console.log(`翻页到${page}`);
                                nowPage = page;
                                pageSelector.children().eq(page + 1).children()[0].click();
                                return;
                            }
                        }
                        let row = $(`body > div.Contentbox > div > div.list > table > tbody > tr:nth-child(${index + 1})`, iframeDoc);
                        if (row.length === 0) {
                            console.log(`选课${course}错误，行数超出范围，跳过课程${course}的选课`);
                            courseIndex++;
                            break;
                        }
                        let courseName = row.children().eq(3).text();
                        console.log(`选课${course}：${courseName}`);
                        // find xxxx in ...showXkyq('xxxx')...
                        let courseId = $("td:nth-child(1) > div > a", row)[0].onclick.toString().match(/showXkyq\('(.*)'\)/)[1];
                        console.log(courseId);
                        iframeWin.saveXsxk1(courseId)
                        courseIndex++;
                        break;
                    case "end":
                        console.log("选课结束");
                        return;
                }
            }
        }
        );

        // 绑定开始事件
        $("#start").click(function () {
            type = $("#type").val();
            courses = $("#courses").val().replace("，", ",").split(",").map((item) => item.trim()).filter((item) => item.length > 0);
            console.log(type, courses);
            statue = "init";
            nowPage = 1;
            courseIndex = 0;
            // 开始选课
            $(`#tabs_container > div > span:nth-child(5) > p:nth-child(${type}) > a`).get(0).click();
        }
        );
    });
})();