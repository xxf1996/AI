$(function () {
    var can = document.getElementById("canvas");
    var ctx = can.getContext("2d");
    var width, height;
    var per;//每个像素块的大小
    var numX, numY;//像素区域块个数
    var bgPath ;//保存网格绘制路径
    var obstaclePath = document.createElement("canvas");//专门放置障碍物的像素信息
    var oTx = obstaclePath.getContext("2d");
    var word_Start = document.getElementById("start");
    var word_End = document.getElementById("end");
    var movePoint;
    var open = [];
    var closed = [];
    var start = new Point(0 , 0);
    var end = new Point(0 , 0);
    var colorS = "#ff3366";//起始点颜色
    var colorE = "#3366ff";//终点颜色
    var colorBack = "#ffffff";//背景颜色
    var colorObstacle = "#555555";//障碍物颜色
    var colorLine = "#666666";

    var getPixelColor = function(x, y){//获取canvas上对应像素点的颜色信息
        var thisContext = ctx;
        var imageData = thisContext.getImageData(x, y, 1, 1);
        // 获取该点像素数据
        var pixel = imageData.data;
        var r = pixel[0];
        var g = pixel[1];
        var b = pixel[2];
        var a = pixel[3] / 255
        a = Math.round(a * 100) / 100;
        var rHex = r.toString(16);
        r < 16 && (rHex = "0" + rHex);
        var gHex = g.toString(16);
        g < 16 && (gHex = "0" + gHex);
        var bHex = b.toString(16);
        b < 16 && (bHex = "0" + bHex);
        var rgbaColor = "rgba(" + r + "," + g + "," + b + "," + a + ")";
        var rgbColor = "rgb(" + r + "," + g + "," + b + ")";
        var hexColor = "#" + rHex + gHex + bHex;
        return {
            rgba : rgbaColor,
            rgb : rgbColor,
            hex : hexColor,
            r : r,
            g : g,
            b : b,
            a : a
        };
    }

    per = 30;

    init();

    Finding();

    can.addEventListener("mouseup" , function(e){
        movePoint = "";
    });

    can.addEventListener("mousedown" , function(e){
        var x = Math.ceil(e.offsetX / per);
        var y = Math.ceil(e.offsetY / per);
        if(e.which == 1){
            if(x == start.x && y == start.y){
                movePoint = "s";
                //can.addEventListener("mousemove" , moved);
            }else if(x == end.x && y == end.y){
                movePoint = "e";
                //can.addEventListener("mousemove" , moved);
            }
            can.addEventListener("mousemove" , moved);
        }
        e.preventDefault();
    });

    $(window).on("resize" , init);

    $("#begin").on("click" , Finding);

    $("#clear").on("click" , function(){
       oTx.clearRect(0 , 0 , width , height);
        DrawPath();
        word_position();
    });

    $("#sure").on("click" , function(){
        if($("#size").val() != null && $("#size").val() != 0){
            per = $("#size").val();
            init();
        }
    });

    /*
     实现拖拽的功能
     */

    function moved(e){
        var x = Math.ceil(e.offsetX / per);
        var y = Math.ceil(e.offsetY / per);
        if(e.which != 1){
            removeEventListener("mousemove" , moved);
        }else if(getC(e.offsetX , e.offsetY) == colorBack){//判断若像素颜色不为背景色则不绘制，避免重复绘制像素块
            if(movePoint == "s"){
                start = new Point(x , y);
                DrawPath();
            }else if(movePoint == "e"){
                end = new Point(x , y);
                DrawPath();
            }else{
                putBlockByPath(oTx , x , y , colorObstacle);
                DrawPath();
            }
            word_position();
        }
    }


    /*
     根据窗口大小重新绘制网格
     */

    function init(){
        width = window.innerWidth;
        height = window.innerHeight;
        numX = Math.floor(width / per);
        numY = Math.floor(height / per);
        can.width = width;
        can.height = height;
        obstaclePath.width = width;
        obstaclePath.height = height;
        ctx.clearRect(0,0,width,height);
        bgPath = new Path2D();
        start = new Point(3 , 12);
        end = new Point(16 , 12);
        getBgPath();
        ctx.fillStyle = colorBack;
        ctx.strokeStyle = colorLine;
        ctx.lineWidth = 1;
        DrawPath();
        word_position();
    }

    /*
     根据窗口大小保存网格绘制信息至path中，便于重复调用绘制
     */

    function getBgPath(){
        bgPath.rect(0 , 0 , width , height);//注意：若不绘制，则为默认的背景色rgba(0,0,0,0)，虽然看起来是白色，但实际上不是！！！
        for(var i = 0 ; i <= numX ; i++){
            bgPath.moveTo(i * per , 0);
            bgPath.lineTo(i * per , height);
        }
        for(var j = 0 ; j <= numY ; j++){
            bgPath.moveTo(0 , j * per);
            bgPath.lineTo(width , j * per);
        }
        //bgPath.closePath();
    }

    /*
     重绘网格背景，相当于重置，进行覆盖更新
     */

    function DrawPath(){
        ctx.clearRect(0 , 0 , width , height);
        ctx.fill(bgPath);
        ctx.stroke(bgPath);
        ctx.drawImage(obstaclePath , 0 , 0);
    }

    function word_position(){
        word_Start.innerText = "(" + start.x + " , " + start.y + ")";
        word_End.innerText = "(" + end.x + " , " + end.y + ")";
        putBlock(start.x , start.y , colorS);
        putBlock(end.x , end.y , colorE);
    }

    /*
     根据坐标位置（x，y）设置指定像素块为指定颜色，矩形大小为per x per
     */
    function putBlock(nx , ny , color){
        var x = (nx - 1) * per;
        var y = (ny - 1) * per;
        var block = document.createElement("canvas");
        block.addEventListener("click" , function(e){
            console.log( x, y);
        });
        var btx = block.getContext("2d");
        block.width = per;
        block.height = per;
        btx.fillStyle = color;
        btx.rect(0 , 0 , per  , per );
        btx.fill();
        ctx.drawImage(block , x , y);
    }


    function putBlockByPath(path , nx , ny , color){
        var x = (nx - 1) * per;
        var y = (ny - 1) * per;
        var block = document.createElement("canvas");
        block.addEventListener("click" , function(e){
            console.log( x, y);
        });
        var btx = block.getContext("2d");
        block.width = per;
        block.height = per;
        btx.fillStyle = color;
        btx.rect(0 , 0 , per  , per );
        btx.fill();
        path.drawImage(block , x , y);
    }

    function getBlockColor(nx , ny){
        var x = (nx - 1) * per + per/2;
        var y = (ny - 1) * per + per/2;
        return getC(x , y);
    }

    function getC(x , y){
        return getPixelColor(x , y).hex;
    }

    function Node(nx , ny , parent , cost){
        this.nx = nx;
        this.ny = ny;
        this.x = (nx - 1) * per + per/2;
        this.y = (ny - 1) * per + per/2;
        if(parent == null){
            this.ParentNode = null;
            this.g = 0;
        }else{
            this.ParentNode = parent;
            this.g = parent.g + cost;
        }
        this.h = Math.abs(end.x - nx) + Math.abs(end.y - ny);
        this.f = this.g + this.h;
    }

    function Point(nx , ny){
        this.x = nx;
        this.y = ny;
    }

    function Finding(){
        open = [];
        closed = [];
        var StartNode = new Node(start.x , start.y , null , 0);
        var minNode = StartNode;
        open.push(StartNode);
        var startTime = new Date().getTime();
        while(open.length > 0){
            minNode = getLessNode();
            if(minNode.nx == end.x && minNode.ny == end.y){
                DrawNode(minNode);
                //console.log(open , closed);
                $("#time").html(new Date().getTime() - startTime + "ms");
                return true;
            }else{
                for(var i = -1 ; i <= 1 ; i++){
                    for(var j= -1 ; j <= 1 ; j++){
                        if(i== 0 && j==0){
                            continue;
                        }else{
                            var newNode = new Node(minNode.nx + i , minNode.ny + j , minNode , Math.sqrt((i*i + j*j)));
                            var overNode;
                            if(isAct(newNode , i , j)){
                                //console.log(open);
                                if(overNode = findInList(closed , newNode)){
                                    if(newNode.f < overNode.f){
                                        removeInList(closed , newNode);
                                        open.push(newNode);
                                    }
                                }else if(overNode = findInList(open , newNode)){
                                    if(newNode.f < overNode.f){
                                        replaceInList(open , overNode , newNode);
                                    }
                                }else{
                                    open.push(newNode);
                                }

                            }else{
                                continue;
                            }
                        }
                    }
                }
            }
            closed.push(minNode);
        }

        return false;
    }

    function getLessNode(){
        var min = open[0].f;
        var minIndex = 0;
        var minNode;
        for(var i = open.length - 1 ; i >= 0 ; i--){
            if(open[i].f < min){
                min = open[i].f;
                minIndex = i;
            }
        }
        minNode = open[minIndex];
        open.splice(minIndex , 1);
        //console.log(minNode);
        return minNode;
    }

    function isAct(node , dx , dy){
        if(node.nx > numX || node.nx < 1 || node.ny > numY || node.ny < 1){
            return false;
        }else if(getBlockColor(node.nx , node.ny) == colorObstacle){
            return false;
        }else if(getBlockColor(node.nx - dx , node.ny) == colorObstacle && getBlockColor(node.nx , node.ny - dy) == colorObstacle){
            return false;
        }
        return true;
    }

    function findInList(list , node){
        var now;
        for(var i = list.length - 1; i >= 0 ; i--){
            now = list[i];
            if(now.nx == node.nx && now.ny == node.ny){
                return now;
            }
        }
        return false;
    }

    function replaceInList(list , node , replace){
        var now;
        for(var i = list.length - 1; i >= 0 ; i--){
            now = list[i];
            if(now.nx == node.nx && now.ny == node.ny){
                list[i] = replace;
            }
        }
    }

    function removeInList(list , node){
        var now;
        for(var i = list.length - 1; i >= 0 ; i--){
            now = list[i];
            if(now.nx == node.nx && now.ny == node.ny){
               list.splice(i , 1);
            }
        }
    }

    function DrawNode(node){
        ctx.strokeStyle = "#ff8400";
        while(node.ParentNode != null){
            ctx.beginPath();
            ctx.moveTo(node.x , node.y);
            node = node.ParentNode;
            ctx.lineTo(node.x , node.y);
            ctx.stroke();
            ctx.closePath();
        }
        ctx.strokeStyle = colorLine;
    }


});