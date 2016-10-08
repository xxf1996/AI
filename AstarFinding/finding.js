jQuery(function ($) {
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
    var start = new Point(0 , 0);
    var end = new Point(0 , 0);
    var colorS = "#ff3366";//起始点颜色
    var colorE = "#3366ff";//终点颜色
    var colorBack = "#ffffff";//背景颜色
    var colorObstacle = "#555555";//障碍物颜色
    var colorLine = "#666666";
    var colorChecked = "rgba(20,20,240,0.2)";
    var StartNode;
    var blocks = [];//类似于open表
    var obstacle = [];
    var checked = [];
    var block_num = 0;
    var startIndex ;
    var endIndex ;
    var type = "JPS";
    var view = [];//存放JPS查找过的节点

    var getPixelColor = function(x, y){//获取canvas上对应像素点的颜色信息
        var thisContext = ctx;
        var imageData = thisContext.getImageData(x, y, 1, 1);
        // 获取该点像素数据
        var pixel = imageData.data;
        var r = pixel[0];
        var g = pixel[1];
        var b = pixel[2];
        var a = pixel[3] / 255;
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

    selectType();

    can.addEventListener("mouseup" , function(e){
        movePoint = "";
    });

    can.addEventListener("mousedown" , function(e){
        var x = Math.ceil(e.offsetX / per);
        var y = Math.ceil(e.offsetY / per);
        if(e.which == 1){
            if(x == start.x && y == start.y){
                movePoint = "s";
            }else if(x == end.x && y == end.y){
                movePoint = "e";
            }
            can.addEventListener("mousemove" , moved);
        }
        e.preventDefault();
    });

    $(window).on("resize" , init);

    $("#begin").on("click" , selectType);

    $("#clear").on("click" , function(){
        oTx.clearRect(0 , 0 , width , height);
        obstacle = [];
        DrawPath();
        word_position();
    });

    $("#list").on("change" , function(e){
       type = $(this).val();
        console.log(type);
    });

    $("#sure").on("click" , function(){
        if($("#size").val() != null && $("#size").val() != 0){
            per = $("#size").val();
            init();
        }
    });

    function selectType(){
        DrawPath();
        word_position();
        if(type == "JPS"){
            JPSFinding();
        }else{
            Finding();
        }
    }

    /*
     实现拖拽的功能
     */

    function moved(e){
        var x = Math.ceil(e.offsetX / per);
        var y = Math.ceil(e.offsetY / per);
        var nowIndex = x * numY + y;
        startIndex = start.x * numY + start.y;
        endIndex = end.x * numY + end.y;
        if(e.which != 1){
            removeEventListener("mousemove" , moved);
        }else if(nowIndex != startIndex && nowIndex != endIndex){//判断若像素颜色不为背景色则不绘制，避免重复绘制像素块
            if(movePoint == "s"){
                start = new Point(x , y);
                DrawPath();
            }else if(movePoint == "e"){
                end = new Point(x , y);
                DrawPath();
            }else{
                putBlockByPath(oTx , x , y , colorObstacle);
                obstacle[x * numY + y] = 1;
                DrawPath();
            }
            word_position();
        }
    }


    /*
     根据窗口大小重新绘制网格
     */

    function init(){
        obstacle =[];
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


    /*
    在相应的path画布上颜色块，方便“分层”
     */

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
        this.dx = end.x - nx;
        this.dy = end.y - ny;
    }

    function Point(nx , ny){
        this.x = nx;
        this.y = ny;
    }

    /*
    JPS节点，direction为查找方向（1,2,3,4）
     */
    function JPSNode(nx , ny , parent , direction){
        var _this = this;
        this.nx = nx ;
        this.ny = ny;
        this.ParentNode = parent;
        this.stepX = null;
        this.stepY = null;
        this.direction = direction;
        this.dx = end.x - nx;
        this.dy = end.y - ny;
        this.x = (nx - 1) * per + per/2;
        this.y = (ny - 1) * per + per/2;
        //this.h = Math.abs(this.dx) + Math.abs(this.dy);
        this.h = Math.sqrt(this.dx * this.dx +
            this.dy * this.dy);
        this.g = null;
        if(this.ParentNode == null){
            this.g = 0;
        }else{
            this.g = parent.g + Math.sqrt((parent.nx - this.nx) * (parent.nx - this.nx) +
                    (parent.ny - this.ny) * (parent.ny - this.ny));
        }
        this.f = this.g + 2 * this.h;
        switch(direction){
            case 1:
                this.stepX = 1;
                this.stepY = 1;
                break;
            case 2:
                this.stepX = 1;
                this.stepY = -1;
                break;
            case 3:
                this.stepX = -1;
                this.stepY = 1;
                break;
            case 4:
                this.stepX = -1;
                this.stepY = -1;
                break;
            default:
                break;
        }
        var move = [];

        /*
        判断当前节点是否有被动邻居，如果有则把被动邻居节点加入到open表中
         */
        this.force = function(){
            for(var i in move){
                switch(parseInt(i)){
                    case 1:
                        //blocks.push(new JPSNode(_this.nx + 1 , _this.ny + 1 , _this , 1));
                        checkJPS(_this.nx + 1 , _this.ny + 1 , _this , 1);
                        break;
                    case 2:
                        //blocks.push(new JPSNode(_this.nx + 1 , _this.ny - 1 , _this , 2));
                        checkJPS(_this.nx + 1 , _this.ny - 1 , _this , 2);
                        break;
                    case 3:
                        //blocks.push(new JPSNode(_this.nx - 1 , _this.ny + 1 , _this , 3));
                        checkJPS(_this.nx - 1 , _this.ny + 1 , _this , 3);
                        break;
                    case 4:
                        //blocks.push(new JPSNode(_this.nx - 1 , _this.ny - 1 , _this , 4));
                        checkJPS(_this.nx - 1 , _this.ny - 1 , _this , 4);
                        break;
                    default:
                        console.warn("!!!!!!");
                        break;
                }
            }
        }


        this.finding = function(){
            var nowPoint = new Point(_this.nx , _this.ny);
            var find = true;
            while(find){
                /*
                当前基点水平方向（stepX）进行查找跳跃点
                 */
                for(var sx = nowPoint.x ; sx > 0 && sx <= numX ; sx += _this.stepX){
                    if((sx * numY + nowPoint.y) == endIndex){
                        if(nowPoint.y == _this.ny){
                            blocks.push(new JPSNode(sx , nowPoint.y , _this , _this.direction));
                            find = false;
                            break;
                        }else{
                            //blocks.push(new JPSNode(nowPoint.x , nowPoint.y , _this , _this.direction));
                            checkJPS(nowPoint.x , nowPoint.y , _this , _this.direction);
                            find = false;
                            break;
                        }

                    }else if(obstacle[sx * numY + nowPoint.y] != null ){
                        break;
                    }else if(ForceNeighbor(sx , nowPoint.y , "x" , _this.stepX)){
                        if(nowPoint.y == _this.ny){
                            if(sx != _this.nx){
                                //blocks.push(new JPSNode(sx , nowPoint.y , _this , _this.direction));
                                checkJPS(sx , nowPoint.y , _this , _this.direction);
                                break;
                            }else{
                                move[ForceNeighbor(sx , nowPoint.y , "x" , _this.stepX)] = 1;
                            }
                        }else{
                            //blocks.push(new JPSNode(nowPoint.x , nowPoint.y , _this , _this.direction));
                            checkJPS(nowPoint.x , nowPoint.y , _this , _this.direction);
                            find = false;
                            break;
                        }
                    }
                }
                /*
                当前基点垂直方向（stepY）进行查找跳跃点
                 */
                for(var sy = nowPoint.y ; sy > 0 && sy <= numY ; sy += _this.stepY){
                    if((nowPoint.x * numY + sy) == endIndex){
                        if(nowPoint.x == _this.nx){
                            blocks.push(new JPSNode(nowPoint.x , sy , _this , _this.direction));
                            find = false;
                            break;
                        }else{
                            //blocks.push(new JPSNode(nowPoint.x , nowPoint.y , _this , _this.direction));
                            checkJPS(nowPoint.x , nowPoint.y , _this , _this.direction);
                            find = false;
                            break;
                        }
                    }else if(obstacle[nowPoint.x * numY + sy] != null){
                        break;
                    }else if(ForceNeighbor(nowPoint.x , sy , "y" , _this.stepY)){
                        if(nowPoint.x == _this.nx){
                           if(sy != _this.ny){
                               //blocks.push(new JPSNode(nowPoint.x , sy , _this , _this.direction));
                               checkJPS(nowPoint.x , sy , _this , _this.direction);
                               break;
                           }else{
                               move[ForceNeighbor(nowPoint.x , sy , "y" , _this.stepY)] = 1;
                           }
                        }else{
                            //blocks.push(new JPSNode(nowPoint.x , nowPoint.y , _this , _this.direction));
                            checkJPS(nowPoint.x , nowPoint.y , _this , _this.direction);
                            find = false;
                            break;
                        }

                    }
                }
                nowPoint.x += _this.stepX , nowPoint.y += _this.stepY;
                /*
                对当前点的有效性的判断，即不能穿过障碍物，不能超出范围
                 */
                if(obstacle[nowPoint.x * numY + nowPoint.y] != null){
                    find = false;
                }else if(nowPoint.x < 1 || nowPoint.x > numX){
                    find = false;
                }else if(nowPoint.y < 1 || nowPoint.y > numY){
                    find = false;
                }else if(obstacle[nowPoint.x * numY + nowPoint.y - _this.stepY] != null && obstacle[(nowPoint.x - _this.stepX) * numY + nowPoint.y] != null){
                    find = false;
                }
                //console.log(find);
            }
            _this.force();
        }
    }

    function JPSFinding(){
        checked = [];
        blocks = [];
        StartNode = new JPSNode(start.x , start.y , null , 0);
        var minNode = StartNode;
        startIndex = start.x * numY + start.y;
        endIndex = end.x * numY + end.y;
        var minIndex;
        blocks.push(minNode);
        var startTime = new Date().getTime();
        while(blocks.length){
            minNode = getLessJPSNode();
            minIndex = minNode.nx * numY + minNode.ny;
            if(minNode.nx == end.x && minNode.ny == end.y){
                DrawNode(minNode);
                $("#time").html(new Date().getTime() - startTime + "ms");
                console.log(minNode);
                break;
            }else{
                /*
                初始点四个方向都要查找跳跃点，其余则按照最小代价的节点方向考察
                 */
                if(minIndex == startIndex){
                    new JPSNode(minNode.nx , minNode.ny , null , 1).finding();
                    new JPSNode(minNode.nx , minNode.ny , null , 2).finding();
                    new JPSNode(minNode.nx , minNode.ny , null , 3).finding();
                    new JPSNode(minNode.nx , minNode.ny , null , 4).finding();
                }else{
                    minNode.finding();
                }
            }
            if((minIndex != startIndex) && (minIndex != endIndex)){
                view.push({"nx" : minNode.nx , "ny" : minNode.ny});
                //putBlock(minNode.nx , minNode.ny , colorChecked);
            }
        }
        DrawView();
    }

    function DrawView(){
        if(view.length){
            var now = view.shift();
            putBlock(now.nx , now.ny , colorChecked);
            setTimeout(DrawView , 16);
        }
    }

    function checkJPS(nx , ny , parent, direction){
        /*
        检查节点的有效性，不能超出范围，也不能重叠，原则上一个点上最多出现四个可能节点（四个方向都有被动邻居【ForcedNeighbor】时）
         */
        var index = nx * numY + ny;
        var arr = checked[index];
        var isNull = true;

        var exist = false;

        if(nx < 1 || nx > numX){
            return false;
        }else if(ny < 1 || ny > numY){
            return false;
        }else if(arr != null){
            isNull = false;
            for(var i = arr.length - 1 ; i >= 0 ; i--){
                //console.log("数组："+ arr + "第" + i + "个元素：" + arr[i] , arr);
                if(parseInt(arr[i]) == parseInt(direction)){
                    exist = true;
                    return false;
                    //console.log("Stop!");
                }
            }
        }
        if(exist){
            return false;
        }
        //console.log(nx , ny , checked[index] , direction , isNull , exist);
        blocks.push(new JPSNode(nx , ny , parent , direction));
        /*
        这里的checked表存放考察过的点，每个点上最多出现四种方向
         */
        if(checked[index] == null){
            var arr = [];
            arr.push(direction);
            checked[index] = arr;
        }else{
            checked[index].push(direction);
        }
        return true;
    }

    function getLessJPSNode(){
        /*
        获取当前代价f最小节点，取出后从数组中去除
         */
        var min = 10000;
        var minNode;
        var minIndex = 0;
        for(var i = blocks.length - 1; i >= 0 ; i--){
            if((blocks[i] != null) && blocks[i].f < min){
                min = blocks[i].f;
                minIndex = i;
            }
        }
        minNode = blocks[minIndex];
        blocks.splice(minIndex , 1);
        return minNode;
    }

    function ForceNeighbor(nx , ny , type , d){

        if(type == "x"){
            if(obstacle[nx * numY + ny + 1] !=null && obstacle[(nx + d) * numY + ny] == null && obstacle[(nx + d) * numY + ny + 1] == null){
                if( d > 0){
                    return 1;
                }else{
                    return 3;
                }

            }else if(obstacle[nx * numY + ny - 1] !=null && obstacle[(nx + d) * numY + ny] == null && obstacle[(nx + d) * numY + ny - 1] == null){
                if(d > 0){
                    return 2;
                }else{
                    return 4;
                }
            }
        }else if(type == "y"){
            if(obstacle[nx * numY + ny + d] == null && obstacle[(nx + 1) * numY + ny] != null && obstacle[(nx + 1) * numY + ny + d] == null){
                if( d > 0){
                    return 1;
                }else{
                    return 2;
                }
            }else if(obstacle[nx * numY + ny + d] == null && obstacle[(nx - 1) * numY + ny] != null && obstacle[(nx - 1) * numY + ny + d] == null){
                if(d > 0){
                    return 3;
                }else{
                    return 4;
                }
            }
        }

        return false;
    }



    function Finding(){
        checked = [];
        blocks = [];
        StartNode = new Node(start.x , start.y , null , 0);
        var minNode = StartNode;
        startIndex = start.x * numY + start.y;
        endIndex = end.x * numY + end.y;
        var minIndex = minNode.nx * numY + minNode.ny;
        blocks[minNode.nx * numY + minNode.ny]= minNode;
        block_num = 1;
        var startTime = new Date().getTime();
        while(block_num > 0){
            minNode = getLessNode();
            if(minNode.nx == end.x && minNode.ny == end.y){
                DrawNode(minNode);
                $("#time").html(new Date().getTime() - startTime + "ms");
                return true;
            }else{
                for(var i = -1 ; i <= 1 ; i++){
                    for(var j= -1 ; j <= 1 ; j++){
                        if(i== 0 && j==0){
                            continue;
                        }else{
                            var newNode = new Node(minNode.nx + i , minNode.ny + j , minNode , Math.sqrt((i*i + j*j)));
                            if(isAct(newNode , i , j)){

                                if(blocks[newNode.nx * numY + newNode.ny] != null){
                                    if(newNode.f < blocks[newNode.nx * numY + newNode.ny].f){
                                        blocks[newNode.nx * numY + newNode.ny] = newNode;
                                    }
                                }else{
                                    blocks[newNode.nx * numY + newNode.ny] = newNode;
                                    block_num ++;
                                        //open.push(newNode);
                                }

                            }else{
                                continue;
                            }
                        }
                    }
                }

            }
            minIndex = minNode.nx * numY + minNode.ny;

            if((minIndex != startIndex) && (minIndex != endIndex)){
                checked[minIndex] = 1;
                putBlock(minNode.nx , minNode.ny , colorChecked);
            }
        }

        return false;
    }



    function getLessNode(){
        var min = 10000;
        var minIndex = StartNode.nx * numY + StartNode.ny;
        var minNode;
        for(var i = 0, max = blocks.length ; i < max ; i++){
            if((blocks[i] != null) && blocks[i].f < min){
                min = blocks[i].f;
                minNode = blocks[i];
            }
        }
        blocks[minNode.nx * numY + minNode.ny] = NaN;
        block_num --;
        return minNode;
    }

    function isAct(node , dx , dy){
        if(node.nx > numX || node.nx < 1 || node.ny > numY || node.ny < 1){
            return false;
        }else if((obstacle[node.nx * numY + node.ny] != null) || (checked[node.nx * numY + node.ny] != null)){
            return false;
        }else if(((obstacle[(node.nx - dx) * numY + node.ny] != null)) && ((obstacle[node.nx * numY + node.ny - dy] != null))){
            return false;
        }
        return true;
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