/**
 * Created by IntelliJ IDEA.
 * User: bmiller
 * Date: 4/20/11
 * Time: 2:01 PM
 * To change this template use File | Settings | File Templates.
 */

/*

Copyright (C) 2011  Brad Miller  bonelake@gmail.com

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

function handleEdKeys(ed, e) {
    if (e.keyCode === 13) {
        if (e.ctrlKey) {
            e.stop();
            runit(ed.parentDiv);
        }
        else if (e.shiftKey) {
            e.stop();
            eval(Sk.importMainWithBody("<stdin>", false, ed.selection()));
        }
    }
}

cm_editors = {}


function outf(text) {
    var mypre = document.getElementById(Sk.pre);
    text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
    mypre.innerHTML = mypre.innerHTML + text;
}

function createEditors() {
    var edList = new Array();
    edList = document.getElementsByClassName("active_code");
    for (var i = 0; i < edList.length; i++) {
        newEdId = edList[i].id;
        cm_editors[newEdId] = CodeMirror.fromTextArea(edList[i], {
            mode: {name: "python",
                version: 2,
                singleLineStringErrors: false},
            lineNumbers: true,
            indentUnit: 4,
            tabMode: "indent",
            matchBrackets: true,
            onKeyEvent:handleEdKeys
        }
                );
        cm_editors[newEdId].parentDiv = edList[i].parentNode.id;
        //requestCode(edList[i].parentNode.id) // populate with user's code
    }

}

function builtinRead(x) {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
        throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}

function runit(myDiv,theButton) {
    //var prog = document.getElementById(myDiv + "_code").value;
    jQuery.get("/hsblog",{'event':'activecode','act': 'run', 'div_id':myDiv}); // Log the run event
    $(theButton).attr('disabled','disabled');
    var editor = cm_editors[myDiv+"_code"];
    var prog = editor.getValue();
    var mypre = document.getElementById(myDiv + "_pre");
    if (mypre) mypre.innerHTML = '';
    Sk.canvas = myDiv + "_canvas";
    Sk.pre = myDiv + "_pre";
    var can = document.getElementById(Sk.canvas);
    // The following lines reset the canvas so that each time the run button
    // is pressed the turtle(s) get a clean canvas.
    if (can) {
        can.width = can.width;
        if (Sk.tg) {
            Sk.tg.canvasInit = false;
            Sk.tg.turtleList = [];
        }
    }
    // configure Skulpt output function, and module reader
    Sk.configure({output:outf,
                read: builtinRead
            });
    try {
        Sk.importMainWithBody("<stdin>", false, prog);
    } catch (e) {
        alert(e);
    }
    $(theButton).removeAttr('disabled');
}

function saveEditor(divName) {
    // get editor from div name
    var editor = cm_editors[divName+"_code"];
    var data = {acid:divName, code:editor.getValue()};
    jQuery.post("/saveprog",data);
    jQuery.get("/hsblog",{'event':'activecode' ,'act':'save', 'div_id':divName}); // Log the run event

}

function requestCode(divName,sid) {
    var editor = cm_editors[divName+"_code"];
    var url = "/getprog"
    var data = {acid: divName}
    if (sid !== undefined) {
        data['sid'] = sid;
    }
    jQuery.get("/hsblog",{'event':'activecode', 'act':'load', 'div_id':divName}); // Log the run event
    jQuery.get(url,data, loadEditor);
}

function loadEditor(data, status, whatever) {
    // function called when contents of database are returned successfully
    var res = eval(data)[0];
    var editor;
    if (res.sid) {
        editor = cm_editors[res.acid+"_"+res.sid+"_code"];
    } else {
        editor = cm_editors[res.acid+"_code"];
    }

    if (res.source) {
        editor.setValue(res.source);
    }
    // need to get the divId back with the result...
}

function createActiveCode(divid,suppliedSource,sid) {
    var eNode;
    var acblockid;
    if (sid !== undefined) {
        acblockid = divid + "_" + sid;
    } else {
        acblockid = divid;
    }

    edNode = document.getElementById(acblockid);

    //edNode.style.display = 'none';
    edNode.style.backgroundColor = "white";
    var editor;
    editor = CodeMirror(edNode, {
                mode: {name: "python",
                    version: 2,
                    singleLineStringErrors: false},
                lineNumbers: true,
                indentUnit: 4,
                tabMode: "indent",
                matchBrackets: true,
                onKeyEvent:handleEdKeys
            });


    var myRun = function() {
        runit(acblockid);
    }
    var mySave = function() {
        saveEditor(divid);
    }
    var myLoad = function() {
        requestCode(divid,sid);
    }
    cm_editors[acblockid+"_code"] = editor;
    var runButton = document.createElement("input");
    runButton.setAttribute('type','button');
    runButton.setAttribute('value','run');
    runButton.onclick = myRun;
    edNode.appendChild(runButton);
    if (sid === undefined) { // We don't need load and save buttons for grading
        var saveButton = document.createElement("input");
        saveButton.setAttribute('type','button');
        saveButton.setAttribute('value','save');
        saveButton.onclick = mySave;
        edNode.appendChild(saveButton);

        var loadButton = document.createElement("input");
        loadButton.setAttribute('type','button');
        loadButton.setAttribute('value','load');
        loadButton.onclick = myLoad;
        edNode.appendChild(loadButton);
    }
    edNode.appendChild(document.createElement('br'));
    var newCanvas = edNode.appendChild(document.createElement("canvas"));
    newCanvas.id = acblockid+"_canvas";
    newCanvas.height = 400;
    newCanvas.width = 400;
    newCanvas.style.border = '2px solid black';
    newCanvas.style.display = 'none';
    var newPre = edNode.appendChild(document.createElement("pre"));
    newPre.id = acblockid + "_pre";
    newPre.className = "active_out";

    myLoad();
    if (! suppliedSource ) {
        suppliedSource = '\n\n\n\n\n';
    }
    if (! editor.getValue()) {
        suppliedSource = suppliedSource.replace(new RegExp('%22','g'),'"');
        suppliedSource = suppliedSource.replace(new RegExp('%27','g'),"'");
        editor.setValue(suppliedSource);
    }
   // $('#'+divid).modal({minHeight:700, minWidth: 410, maxWidth:450, containerCss:{width:420, height:750}});
}

function whilestep() {
    whileanimid = setInterval(animateWhile,500)
}

function animateWhile() {
    var lineEl = document.getElementById('linenum');
    line = lineEl.innerText;
    lnum = Number(line[line.length-1]);
    var prev = 'line'+(lnum-1);
    var ycond = document.getElementById('whilecond');
    if (ycond.innerText == 'false' && lnum == 1) {
        document.getElementById('line1').style.backgroundColor = '#d00';
        document.getElementById('whilecond').style.backgroundColor = '#d00';
        document.getElementById('line4').style.backgroundColor = '#fff';
        lineEl.innerText = 'line2'
        return;
    } else if  (ycond.innerText == 'false' && lnum == 2) {
        document.getElementById('line1').style.backgroundColor = "#fff";
        document.getElementById('line5').style.backgroundColor = "#ddd";
        clearInterval(whileanimid);
        return;
    }
    var pline;
    if (lnum-1 < 1) {
        pline = document.getElementById('line4');
    } else {
        pline = document.getElementById(prev)
    }
    if (pline) {
        pline.style.backgroundColor = '#fff';
    }
    document.getElementById(line).style.backgroundColor = '#ddd';
    if (Number(lnum)+1 > 4) {
        line = 'line1';
    } else
        line = 'line'+(lnum+1);
    lineEl.innerText = line;
    if (lnum == 2) {
        var xpos = document.getElementById('xcorval');
        var xposn = Number(xpos.innerText) + 10;
        xpos.innerHTML = xposn;
        if (xposn >=100) {
            ycond.innerHTML = 'false';
        }
    }

    
}


function comment(blockid) {
    $.modal('<iframe width="600" height="400" src="/getcomment?id='+blockid+'" style="background-color: white">', {
    //$.modal('<form><textarea name="content"></textarea><input type="submit" name="submit" > </form>', {
    overlayClose: true,
    closeHTML:"",
    containerCss:{
        width:600,
        height:400,
        backgroundColor: "#fff"
    }
            });
}

function checkBool(exp,selId,feedback,summary) {
    var res = eval(exp);
    var ans = eval(document.getElementById(selId).value);
    var sumEl = document.getElementById(summary);
    var sumTot = Number(sumEl.innerText);
    if (ans == res) {
        document.getElementById(feedback).innerHTML = 'correct';
        $("#"+feedback).html('correct');
        sumTot = sumTot + 1;
        sumEl.innerText = sumTot;
    } else {
        document.getElementById(feedback).innerHTML = 'incorrect';
    }
}

function sendGrade(grade,sid,acid) {
    data = {'sid':sid, 'acid':acid, 'grade':grade};
    jQuery.get('/savegrade',data);
}

$(document).ready(createEditors);
