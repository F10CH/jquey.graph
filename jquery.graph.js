// graph2.js (needs jquery)
var jQuery;
if(!jQuery) throw 'jQuery needed'

jQuery.fn.CanvasGraph = function(config, appendTo){

	var _canvas = this.filter('canvas');
	var _self = this;
	var version = "0.3b/20160414";
	// config
	// .width : integer
	// .height : integer
	// .class : string
	// .ratio : float --force width/height ratio
	// .minHeight : integer
	// .margin : [xmargin,ymargin]
	// .line : {stroke, width, radius, fill:null, point:[['circle','square'],fill]}
	// .bar : { xmargin, stroke, width, fill, radius, point:['circle','square']}
	// .legend : {stroke,fill,textBaseline,testAlign,font,size}
	// .axis : { width, stroke, xlabel:false, ylabel:false}
	// .colorSet : Array[color]
	// .pieColorSet : Array[color]
	// .range : {step, xstart, xend, ymin, ymax}
	// .autoRefresh : boolean -- refresh on resize

	this.config = {
		colorSet : ['#60A0F0','#5060A0'],
		pieColorSet : ['red','yellow','blue','green','orange','pink','gray','brown','violet','olive','cyan']
	};

	var number2absolute = function(str,reference){
		var v = parseFloat(str);
		if(typeof(reference)!='number') return v;
		if(str.match(/px$/)) return v;
		if(str.match(/%$/)) return v/100*reference;
		else return v*reference;
	};

	var date2int = function (str){
		if(typeof(str)=='number') return str;
		var s = str.split("/");
		var i = (parseInt(s[1])-2000)*12+parseInt(s[0])-1;
		return i;
	};

	var int2date= function(i){
		var m = i%12;
		var y = parseInt(i/12);
		return m+'/'+(y>10?y:'0'+y);
	};

	var convertCoordinates = function(data, converter){
		var max = 0; var min = 0;
		var coords = [];
		var i = 0;
		var is_array = (data instanceof Array);

		for(var x in data){
			var y = parseFloat(is_array?data[x][1]:data[x]);
			if(is_array) x = data[x][0];
			if(typeof(converter)=='function') y = converter(y,i);
			coords.push([x,y]);
			max = Math.max(y, max); min = Math.min(y, min);
			i++;
		}

		return {coords:coords, max:max, min:min, start:coords[0], end:coords[coords.length-1] };
	};

	var findMinMax = function(coordinates){
		var min = 0, max = 0;
		for(var i=0; i<coordinates.length; i++){
			var y = parseFloat(coordinates[i][1]);
			max = Math.max(y, max);
			min = Math.min(y, min);
		}
		return [min,max];
	};



	var drawPie = function(ctx, data, options){
		if(data.length == 0) return;
		if(options == undefined) options = { };
		if(typeof(options.colorSet)!='object') colorSet = _self.config.pieColorSet;

		var width = ctx.canvas.width;
		var height = ctx.canvas.height;
		var radius = height/2.2;
		var dy = height/10;
		ctx.clearRect(0,0,width,height);

		ctx.save();

		ctx.strokeStyle = 'black';
		ctx.lineWidth = 1;
		var p = 0, a = 0, c = 0, sum = 0, entry = null, text;

		var entries = [];
		for(var i in data){
			if(data.length != undefined) entries[i] = {label:data[i][0] ,value:parseFloat(data[i][1])};
			else entries = 	data[i];
			sum += entries[i].value;
		}
		ctx.font = "bold 13px Arial";
		ctx.fillStyle = 'black';
		ctx.textBaseline = 'top';
		ctx.fillText("Total: "+ Math.round(sum*100)/100,height,dy);
		if(options.title){
			ctx.font = "bold 14px Arial";
			ctx.fillStyle = 'gray';
			ctx.fillText(options.title,height*0.8,dy-20);
		}

		dy+=20;

		ctx.font = "12px Arial";
		for(var i in entries){
			if(options.limit && (i>=options.limit))
				entry = {value:sum-c,label:'...remains'};
			else{
				entry = entries[i];
			}

			c += entry.value;
			a = entry.value * Math.PI * 2 / sum;
			ctx.fillStyle = colorSet[i%colorSet.length];
			ctx.beginPath();
			ctx.moveTo(height/2, height/2);
			ctx.arc(height/2, height/2, radius, p+0.3, p-a+0.3, true);
			ctx.closePath();
			ctx.fill();

			ctx.globalAlpha = 0.3;
			ctx.stroke();
			ctx.globalAlpha = 1;
			p-=a;
			text = entry.label;
			if(entry.extra!=undefined)
				text += " ("+entry.extra+")";

			drawLegend(ctx, text, entry.value/sum ,colorSet[i%colorSet.length],height,dy+i*16);
			if(c>=sum) break;
		}
		ctx.restore();
	};

	var drawLegend = function(ctx, text, per, color, dx, dy){
		ctx.save();
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 0.5;
		ctx.translate(dx,dy);
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillStyle = color;
		ctx.fillRect(0,0,10,6);
		ctx.strokeRect(0,0,10,6);
		ctx.fillStyle = 'black';
		var label = Math.round(per*100)+"%";
		if(text!=undefined)
			label += " "+text;
		ctx.fillText(label,15,-3);
		ctx.restore();
	};

	var drawGraph = function(ctx, data, options){
		// options
		// .type = 'month','year','day','label'
		// .drawing = 'bar','line'
		// .clear = boolean
		// .fixedCount = integer
		// .range = {step,xstart,xend,ymin,ymax}
		// .baseY = size(float,'px','%')
		if(!options) options = {};
		var type = options.type || data.type;
		data = convertCoordinates(data, options.convert);
		var coords = data.coords;
		var bounds = options.fixedBounds || [data.min, data.max];

		if(coords[0][0].match(/\d{4}[:\/]\d+/)) type = "year";
		else if(coords[0][0].match(/\d{2}[:\/]\d+/)) type = "month";

		var date_mode = (type == "year") || (type == "month") || (type == "day");

		var count = options.fixedCount || data.coords.length;
		if(!count || isNaN(count) || count<=0) return false;
		//if(options.logarithmic){
		//	bounds = [Math.log(bounds[0])/Math.LN10, Math.log(bounds[1])/Math.LN10];
		//}

		if(options.autoComplete){
			// TODO
		}

		var width = ctx.canvas.width;
		var height = ctx.canvas.height;
		if(options.clear) ctx.clearRect(0,0,width,height);

		var baseY = options.baseY?number2absolute(options.baseY,height):25;
		var step = (options.range && options.range.step)?number2absolute(options.range.step,width):width/count;

		var colorSet = options.colorSet || _self.config.colorSet || ['gray'];

		ctx.fillStyle = "#EEEEEE";
		ctx.fillRect(0,0,width,height);
		ctx.lineWidth = 1;

		/*var gradient = ctx.createLinearGradient(0, 0, width, 0);
		gradient.addColorStop(1.0, "#60A0F0");
		gradient.addColorStop(0.2, "#90A0C0");
		gradient.addColorStop(0.0, "#AAA");*/

		var max = bounds[1]==0?10:bounds[1]*1.1;
		var min = bounds[0]<0?bounds[0]*1.1:0;
		if(max>=1000 ) max*=1.2;
		if(max<=-1000 ) min*=1.2;
		var yFactor = (height-baseY)/(max-min);
		ctx.save();
		ctx.scale(1,-1);
		ctx.translate(0,-height+baseY-yFactor*min);

		var pow = Math.ceil(Math.log(max-min)/Math.LN10)-1;
		var ystep = Math.pow(10,pow);
		var substep = (ystep>=4)?4:1;
		if(substep>1 && max/ystep>=5) substep=2;

		for(var i=0; i<= max-min; i+= ystep/substep){
			ctx.beginPath();
			ctx.strokeStyle = (i%ystep!=0)?"#DDD":"#AAA";
			ctx.lineTo(0,yFactor * i); ctx.lineTo(width, yFactor * i);
			ctx.stroke();
		}

		if(options.drawing == 'line'){
			ctx.lineWidth = options.lineWidth || 1;
			ctx.beginPath();
			ctx.moveTo(step/2, yFactor * coords[0][1]);
		}
		var idx;
		for(var i in coords){

			var y = coords[i][1];
			//if(options.logarithmic) y = Math.log(y)/Math.LN10;
			if(date_mode){
				var x = coords[i][0].split(/[\/\s:-]/);
				idx = parseInt(x[0]);
			}
			else
				idx = i;
			var color = y<0?'red':colorSet[ idx%colorSet.length ];

			if(options.drawing == 'line'){
				ctx.strokeStyle = color;
				ctx.lineTo(i/count*width+step/2, yFactor * y);

			}
			else{
				ctx.fillStyle = color;
				ctx.fillRect (i/count*width, 0, step-2, yFactor * y);
			}
		}
		if(options.drawing == 'line') ctx.stroke();

		ctx.restore();

		for(var i in coords){
			var y = coords[i][1];
			//if(options.logarithmic) y = Math.log(y)/Math.LN10;
			var xaxis = i/count*width;
			drawValue(ctx, y, xaxis, count, width, height, baseY-yFactor*min, yFactor, options);
		}

		if(type=="month")
			drawMonthLabel(ctx, coords, width, height, baseY, yFactor, count);
		else if(type=="year")
			drawYearLabel(ctx, coords, width, height, baseY, yFactor, count);
		else
			drawLabel(ctx, coords, width, height, baseY, yFactor, count, options);

		if(options.title){
			ctx.font = "bold 12px Arial";
			ctx.textAlign = "center";
			ctx.fillStyle = "black";
			ctx.fillText(options.title, width/2, 14);
		}
	};

	var drawValue = function(ctx, y, xaxis, count, width, height, baseY, yFactor, options){
		var stdFont = options.fontValue || "10px Arial";
		var smallFont = "9px Arial";
		var step = width/count;
		if(y==0) return;
		y2 = height-baseY-2- (yFactor * y);

		if(Math.abs(y)>=1000 && step<30){
			ctx.textAlign = "right";
			ctx.font = smallFont;
			ctx.fillStyle = "black";
			ctx.save();
			if(y<0) ctx.translate(xaxis+step/2-4, height-baseY-4);
			else ctx.translate(xaxis+step/2-4, y2<0?12:y2-2);
			ctx.rotate(Math.PI/2);
			ctx.fillText(y, 0,0);
			ctx.restore();
		}
		else{
			ctx.font = stdFont;
			ctx.textAlign = "center";
			ctx.fillStyle = y2< 0?"white":"black";
			try{
				ctx.fillText(y, xaxis+step/2-2, y2< 0?12:y2-2);
			}
			catch(ex){
				//console.log(y, xaxis+step/2-2, y2< 0?12:y2-2);
			}
		}

	};

	var drawLabel = function(ctx, coords, width, height, baseY, yFactor, count, options){
		var stdFont = options.fontLabel || "10px Arial";
		var colorFont =  options.colorLabel || "gray";
		var step = width/count;
		var i;
		for(i in coords){
			var x = coords[i][0];
			var y = coords[i][1];
			var y2 = height;
			var xaxis = i/count*width;
			ctx.font = stdFont;
			ctx.textAlign = "center";
			ctx.fillStyle = colorFont;
			if(options.labelstyle == 'yy/mm'){
				yymm = x.split(/[\/\s:-]/);
				ctx.fillText(yymm[1], xaxis+step/2-2, y2-(baseY*1/3));
			}
			else
				ctx.fillText(x, xaxis+step/2-2, y2-(baseY*1/3));
		}
	};

	var drawMonthLabel = function(ctx, coords, width, height, baseY, yFactor, count){
		var stdFont = "10px Arial";
		var step = width/count;
		var i;
		for(i in coords){
			var x = coords[i][0];
			var y = coords[i][1];
			var y2 = height;
			var xaxis = i/count*width;
			ctx.font = stdFont;
			ctx.textAlign = "center";
			ctx.fillStyle = "gray";
			ctx.fillText(x, xaxis+step/2-2, y2-14);
		}
	};

	var drawYearLabel = function(ctx, coords, width, height, baseY, yFactor, count){
		var stdFont = "10px Arial";
		var step = width/count;
		var i;
		for(i in coords){
			var x = coords[i][0].split(/[\/\s:-]/);
			var y = coords[i][1];
			var y2 = height;
			var xaxis = i/count*width;
			ctx.font = stdFont;
			ctx.textAlign = "center";
			ctx.fillStyle = "gray";
			if(x.length==1){
				ctx.fillText(x[0], (parseInt(i))/count*width+step/2, y2-6);
				continue;
			}

			var month = parseFloat(x[1]);

			ctx.fillText(x[1], xaxis+step/2-2, y2-14);

			if(month==6){
				ctx.textAlign = "center";
				ctx.fillText(x[0], (parseInt(i))/count*width+step, y2-2);
			}
			if(month==1){
				ctx.strokeStyle = "#CCC";
				ctx.beginPath();
				ctx.lineTo(xaxis-2,y2); ctx.lineTo(xaxis-2, y2-baseY);
				ctx.stroke();
			}
		}
	};

	this.set = function(config){
		if(typeof(config) != 'object') return this;
		this.config = Object.assign(this.config, config);
		return this
	};

	this.add = function(parentNode, attr){
		canvas = document.createElement("canvas");
		if(!parentNode){
			if(_canvas.length==0) return null;
			_canvas.last().after(canvas);
		}
		else
			$(parentNode).append(canvas);

		if(attr) $(canvas).attr(attr);
		return _canvas.add(canvas).CanvasGraph();
	};

	this.contexts = function(){
		return _canvas.map((i,c)=>{ return c.getContext('2d') }).get()
	}

	this.extract = function(selector){
		var canvases = this.filter(selector);
		_canvas.remove(canvases);
		return canvases.CanvasGraph();
	};

	this.resetDimension = function(){
		this.each((i,c)=>{
			c.width = $(c).width()
			if(this.config.ratio)  $(c).height(c.width / this.config.ratio)
			if(this.config.minHeight && $(c).height()<this.config.minHeight)  $(c).height(this.config.minHeight)
			c.height = $(c).height()

		})
	}

	var retainedLastAction = [null,null,null]

	this.drawWaiting = function(){
		this.resetDimension()
		this.contexts().forEach((ctx)=>{
			ctx.fillStyle = "gray";
			ctx.font = "18px Arial";
			ctx.textAlign = "center";
			ctx.fillText("Data loading...",ctx.canvas.width/2, ctx.canvas.height/2);
			ctx.strokeStyle = "gray";
			ctx.lineWidth = 3;
			ctx.strokeRect(0,0,ctx.canvas.width,ctx.canvas.height);
		})
		return this
	}

	this.drawGraph = function(data, options){
		retainedLastAction = [arguments.callee, data, options]
		this.resetDimension()
		this.contexts().forEach((ctx)=>{ drawGraph(ctx,data,options) })
		return this;
	}

	this.drawPie = function(data, options){
		retainedLastAction = [arguments.callee, data, options]
		this.resetDimension()
		this.contexts().forEach((ctx)=>{ drawPie(ctx,data,options) })
		return this;
	}

	this.refresh = function(){
		if(retainedLastAction && retainedLastAction[0] instanceof Function)
			retainedLastAction[0].call(this,retainedLastAction[1],retainedLastAction[2])
	}

	var resize_timeout = undefined
	$(window).on('resize',()=>{
		clearTimeout(resize_timeout)
		resize_timeout = setTimeout(()=>{
			_self.trigger('resize.graph')
			resize_timeout = null
		},_self.config.refreshDelay || 500)
	})

	this.init = function(config){
		this.set(config)
		if(this.config.width) this.attr("width",this.config.width)
		if(this.config.height) this.attr("height",this.config.height)
		if(this.config.class) this.addClass(this.config.class)
		if(appendTo) $(appendTo).append(this)
		console.log(this.config)
		if(this.config.autoRefresh){
			var __self__ = this
			this.off('resize.graph').on('resize.graph',()=>{
				__self__.refresh()
			})
		}
		return this;
	};

	return this.init(config);
};

jQuery.fn.CanvasGraph.version = "1.0.0";
jQuery.fn.CanvasGraph.git = "1.0.0";

jQuery.CanvasGraph = function(selector, config){
	return $(selector).CanvasGraph(config)
};
