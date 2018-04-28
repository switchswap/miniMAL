// ==UserScript==
// @name         MiniMAL
// @namespace    rMiniMal
// @version      0.1
// @description  Adds some goodies to /r/anime
// @author       TrickRoom
// @include     *reddit.com/r/anime*
// @run-at      document-end
// @require     https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant       GM_xmlhttpRequest
// @grant       GM_openInTab
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

// ~ ~~ Features ~~ ~
// * Turns URLs in user flairs to clickable links
// ~      ~~~~      ~

//onPageLoad

setupConfig();
makeStyleSheet();
clickify();
//todo: make the frame to display the stats and ur good

//main functions
function setupConfig() {
    GM_config.init({
        "id": "rapConf",
        "title": "/r/Anime+ Settings",
        "fields":
        {
            "fetchInfo": {
                "label": "Fetch user stats",
                "type": "checkbox",
                "default": true
            },
            "fetchShared": {
                "label": "Fetch shared anime",
                "type": "checkbox",
                "default": false
            },

            "malName": {
                "label": "Your MAL Profile to compare shared anime",
                "type": "string",
                "default": null
            },

            "includePTW": {
                "label": "Include PTW in shared anime",
                "type": "checkbox",
                "default": false
            },
            "debug": {
                "label": "Debug mode",
                "type": "checkbox",
                "default": false
            }
        },
        "css": "#rapConf { background-color: #F6F6FE !important; }" +
        "#rapConf .config_header { color: #369 !important; }"
    });

    g_fetchInfo = GM_config.get("fetchInfo");
    g_fetchShared = GM_config.get("fetchShared");
    g_malName = GM_config.get("malName");
    g_includePTW = GM_config.get("includePTW");
    g_debug = GM_config.get("debug");

    GM_registerMenuCommand("Open settings", function(){ GM_config.open(); }, "s");
    GM_registerMenuCommand("Open github repo", function(){ GM_openInTab("hello:"); }, "g");
}

function makeStyleSheet() {
    GM_addStyle(
        "#anime-infoBox { position: absolute; padding: 2px 5px; " +
        "background-color: #557eb8; opacity: 0.9; color: #FFF; " +
        "font-size: 11px; " +
        "z-index:99;}" +
        "#anime-infoBox::before { content: ''; position: absolute; " +
        "bottom: -8px; left: 18px; font-size: 0; opacity: 0.9; " +
        "border-style: solid; border-width: 4px; " +
        "border-color: #557eb8 transparent transparent;" +
        "z-index:99;}"
    );
}

function clickify(){
    var flairs = document.getElementsByClassName("flair");
    //if(g_debug) console.log("Found " + flairs.length + " flairs.");
    var linkFlairs = [];
    for(let i=0; i<flairs.length;i++){
        var flairText = flairs[i].innerHTML;
        if(flairText.search("^https?://")!=-1){
            //url found
            //if(g_debug) console.log("Found URL: " + flairText);
            linkFlairs.push(flairText);
            toLink(flairs[i]);
            if(g_fetchInfo || g_fetchShared) setToolTip(flairs[i]);
        }
    }
}

function toLink(flair){
    var flairText = flair.innerHTML;
    flair.innerHTML = flairText.link(flairText);
}

function getShared(name1,name2){
    return new Promise(function(resolve, reject) {
        Promise.all([getList("https://myanimelist.net/malappinfo.php?u=" + name1 + "&status=all&type=anime"), getList("https://myanimelist.net/malappinfo.php?u=" + name2 + "&status=all&type=anime")])
            .then(function(lists) {
            var  combinedList = lists[0][0].concat(lists[1][0]);
            //compare arrays
            var sharedList = [];
            var counts = [];
            for(let i = 0;i<combinedList.length;i++){
                if(counts[combinedList[i]] === undefined){
                    counts[combinedList[i]] = 1;
                }
                else{
                    sharedList.push(combinedList[i]);
                }
            }
            if(g_debug) console.log(sharedList);
            return resolve(sharedList);
        });
    });
}

function getInfo(name1){
    return new Promise(function(resolve, reject) {
        getList("https://myanimelist.net/malappinfo.php?u=" + name1 + "&status=all&type=anime")
            .then(function(list) {
            if(g_debug) console.log(list);
            return resolve(list[1]);
        });
    });
}

function getList(url) {
    return new Promise(function(resolve, reject) {
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            synchronous: false,
            timeout: 0,
            onload: function (resp) {
                if(g_debug) console.log("Got Response HTML!");
                return resolve(onPageLoad(resp.responseText));
            },
            ontimeout: function () {
                if(g_debug) console.log("GET Request Failed!");
                return null;
            }
        });
    });
}

function onPageLoad(resp){
    var aniListArr=[];
    var statsArr=[];
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(resp,"text/xml");
    if(g_fetchInfo){
        var domStats = xmlDoc.getElementsByTagName("myinfo")[0];
        statsArr.push(domStats.getElementsByTagName("user_name")[0].innerHTML);
        statsArr.push(domStats.getElementsByTagName("user_watching")[0].innerHTML);
        statsArr.push(domStats.getElementsByTagName("user_completed")[0].innerHTML);
        statsArr.push(domStats.getElementsByTagName("user_onhold")[0].innerHTML);
        statsArr.push(domStats.getElementsByTagName("user_dropped")[0].innerHTML);
        statsArr.push(domStats.getElementsByTagName("user_plantowatch")[0].innerHTML);
        statsArr.push(domStats.getElementsByTagName("user_days_spent_watching")[0].innerHTML);
    }
    if(g_fetchShared){
        var domAniList = xmlDoc.getElementsByTagName("anime");
        if(g_includePTW){
            for(let i=0;i<domAniList.length;i++){
                aniListArr.push(domAniList[i].getElementsByTagName("series_title")[0].innerHTML);
            }
        }
        else{
            for(let i=0;i<domAniList.length;i++){
                if(domAniList[i].getElementsByTagName("my_status")[0].innerHTML!="6"){
                    aniListArr.push(domAniList[i].getElementsByTagName("series_title")[0].innerHTML);
                }
            }
        }
    }
    var responseArr = [aniListArr,statsArr];
    return responseArr;
}

function setToolTip(flair) {
    //create box
    var infoBox = document.getElementById('anime-infoBox');
    var html = "<div id='anime-infoBox' style='display:none';></div>";
    var name;
    if(infoBox==null){
        var newInfoBox = document.createElement("div");
        newInfoBox.innerHTML = html;
        document.body.firstChild.parentNode.insertBefore(newInfoBox,document.body.firstChild);
        console.log("made an info box");
    }
    flair.firstChild.onmouseover = function(){
        //position box, get data, and append it
        infoBox.style.top= getPosition(this).y - 20 +"px";
        infoBox.style.left= getPosition(this).x +"px";
        infoBox.style.display = "block";
        infoBox.innerHTML = "<center><img src='https://i.imgur.com/Ykoy5.gif' width='50%'/></center>"

        //get the info and add it to the box
        if(g_fetchInfo && g_fetchShared && g_malName!=""){ //both enabled
            if(flair.getElementsByTagName("a")[0].host == "myanimelist.net"){
                username = flair.getElementsByTagName("a")[0].innerHTML.substring(flair.getElementsByTagName("a")[0].innerHTML.lastIndexOf('/') + 1);
                Promise.all([getInfo(username), getShared(g_malName,username)])
                    .then(function(resp) {
                    var p = document.createElement("P");
                    var t = document.createTextNode("W:"+resp[0][1]+" C:"+resp[0][2]+" H:"+resp[0][3]+" D:"+resp[0][4]+" P:"+resp[0][5] +" T:"+resp[0][6]+"d S:"+resp[1].length);
                    p.appendChild(t);
                    console.log(p);
                    infoBox.innerHTML = ""
                    infoBox.appendChild(p);
                });
            }
        }
        else if(g_fetchInfo && !g_fetchShared){ //only fetchInfo
            if(flair.getElementsByTagName("a")[0].host == "myanimelist.net"){
                username = flair.getElementsByTagName("a")[0].innerHTML.substring(flair.getElementsByTagName("a")[0].innerHTML.lastIndexOf('/') + 1);
                getInfo(username)
                    .then(function(resp) {
                    var p = document.createElement("P");
                    var t = document.createTextNode("W:"+resp[1]+" C:"+resp[2]+" H:"+resp[3]+" D:"+resp[4]+" P:"+resp[5] +" T:"+resp[6]+"d");
                    p.appendChild(t);
                    console.log(p);
                    infoBox.innerHTML = ""
                    infoBox.appendChild(p);

                });
            }
        }
        else if(!g_fetchInfo && g_fetchShared && g_malName!=""){ //only fetchShared
            if(flair.getElementsByTagName("a")[0].host == "myanimelist.net"){
                username = flair.getElementsByTagName("a")[0].innerHTML.substring(flair.getElementsByTagName("a")[0].innerHTML.lastIndexOf('/') + 1);
                getShared(g_malName,username)
                    .then(function(resp) {
                    var p = document.createElement("P");
                    var t = document.createTextNode("Shared:"+resp.length);
                    p.appendChild(t);
                    console.log(p);
                    infoBox.innerHTML = ""
                    infoBox.appendChild(p);
                });
            }
        }
    };
    flair.firstChild.onmouseout = function(){
        //hide the box
        infoBox.style.display = "none";
        infoBox.innerHTML = "";

    };
}

function getPosition(el) {
    var xPos = 0;
    var yPos = 0;
    while (el) {
        xPos += (el.offsetLeft);
        yPos += (el.offsetTop);
        el = el.offsetParent;
    }
    return {
        x: xPos,
        y: yPos
    };
}

/*
Inspired by: https://github.com/v0x76/osugame_funcp !
*/
