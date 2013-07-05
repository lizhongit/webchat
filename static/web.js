// point类
var point = {
	notice : null,
	notice_ico : 'http://www.gravatar.com/avatar/508c2929a1cbb62992951fb028f516af.jpg?s=60$d=&r=G',
	isDeskTopNotice : true,
	notice_desktop_obj : null,
	show : function(title,msg){
		if(point.isSupport && point.isDeskTopNotice){
			point.notice_close();
			point.notice_desktop_obj = point.notice.createNotification(point.notice_ico,title,msg);
			point.notice_desktop_obj.ondisplay = point.notice_display;
			point.notice_desktop_obj.onclose = function(){};
			point.notice_desktop_obj.show();
		}
	},
	notice_close :function(){
		if(point.notice_desktop_obj){
			point.notice_desktop_obj.close();
		}
		point.notice_desktop_obj = null;
	},
	notice_display :function(){
		
	},
	getPermission : function(){
		point.notice.requestPermission();
		$('button').remove();
	},
	init : function(){
		point.notice = window.webkitNotifications;
		if(point.notice){
			point.isSupport = true;
			if( point.notice.checkPermission() != 0){
				log.add('<button onclick="point.getPermission();">请点击这里允许桌面通知</button>');
			}
		}else{
		
			point.isSupport = false;
		}
	}	
};

// history
var history = {
	log:[],	
	add:function(str){
		history.log.push(log.encodeHtml(str));	    
	}
};

// focus
var focus = {
	isFocus:true,
	is : function(){	
		return focus.isFocus;
	},
	init :function(){
		$(window).focus(function(){
			focus.isFocus = true;		      
			point.notice_close();
		}).blur(function(){
			focus.isFocus = false;			      
		});
	}
};

// command类
var command = {
	'history' : {
		'name' : '查看历史记录',	
		'fun' : function(){
			var html = '';
			var num = 1;
			for(var i in history.log){
				html += num+'. '+history.log[i] + '<br />';
				num++;
			}	
			log.add(html);
		}
	},
	'who' : {
		'name' : '查看在线用户',	
		'fun' : function(userlist){
			if(typeof userlist == 'object'){
				var html = '';
				var i = 1;
				for(var item in userlist){
					if(Number(item)<100){ continue; }
					html += i + ', id : ' + item + ' , Login Time : ' + userlist[item].time;
					html += ', name : ' + userlist[item].user + '<br />'
					i++;
				}

				html = '共有'+(i-1)+'位用户在线<br />' + html;

				log.add(html);
			}else{
				var result = so.send(':who');	
				if(!result){
					log.local('Execute the command fails, May be disconnected!');	
				}
			}	
		}
	},
	'connect' : {
		'name' : '连接命令',
		'fun'  : function(){
			so.connect();				
		}
	},
	'clear' : {
		'name' : '清屏命令',
		'fun'  : function(){
			log.clear();				
		}
	},
	'face' : {
		'name' : '表情列表',
		'fun'  : function(){ 
			log.add(face.list());	
		}
	},
	'bgcolor' : {
		'name' : '背景颜色修改',	
		'fun'  : function(){
			color.show(function(value){
				$('body').css('background',value);
				chat.obj.css('background',value);
			});	
		}
	},
	'mycolor' : {
		'name' : '我的聊天文字颜色',	
		'fun'  : function(){
			color.show(function(value){
				user.color = value;			
			});	
		}						
	},
	'color' : {
		'name' : '公聊颜色',	
		'fun'  : function(){
			color.show(function(value){
				color.color = value;			
				$('body').css('color',value);	
				chat.obj.css({
					'color':value,		
					'border':'1px solid '+value
				});
			});
		}						
	},
	'img' : {
		'name' : '发布图片 格式 " :img url " ',
		'fun'  : function(str){
			if( typeof str.split(' ')[1] == 'string' && str.split(' ')[1].length>20){
				chat.send(str);	
			}else{
				log.local('命令格式错误，请加上图片地址');		
			}
		}
	},
	'help' : {
		'name' : '帮助命令',	
		'fun' : function(){
			html = 'system command list <br />';
			for(var i in command){
				if(i=='help') continue;
				html += ':' + i + ' : ' + command[i]['name']+'<br />';
			}
			log.add(html);
		}
	}
};

// chat类
var chat = {
	exec:function(msg){
		var com = msg.substr(1).split(' ')[0];
		if(typeof command[com] != 'undefined'){
			log.add('[command]# '+log.encodeHtml(msg));
			command[com].fun(msg);
		}else{	
			log.add('[command]# '+log.encodeHtml(msg)+' command not found');
		}
		this.obj.val('');
	},
	send:function(msg){ 
		var sendresult = so.send(msg);
		if(sendresult){
			this.obj.val('');
		}else{
			log.local('Sorry , Is not connected to the server, You can not send a message!');
		}
	},
	pre:[
		{
			'name' : '表情提示',
			'fun' :  'face.faceInfo'
		}
	],
	bind:function(){
		this.obj.keyup(function(e){
			var msg = $.trim($(this).val());
			if(e.keyCode==13 && msg !=''){
				history.add(msg);
				if(!user.name){
					user.name = msg;
					chat.obj.val('');
					so.connect();
					
				}else if(msg.substr(0,1)==':'){
					chat.exec(msg);
				}else{
					chat.send(msg);		
				}
			}     

			for(var i in chat.pre){
				if(typeof chat.pre[i].fun == 'function' ){
					chat.pre[i].fun($(this).val()); 
				}else{
					eval(chat.pre[i].fun+'(\''+$(this).val()+'\')');	
				}
			}

		});
	},

	init:function(str){
		this.obj = $(str);    
		this.bind();
	}
};

// socket Obj
var so = {
	reconnect_max_num:2,
	reconnects:0,
	reconnectset:'',
	ws:null,
	isConnectd : false,
	connect : function(){
		so.reconnects++;
		var _this = so;
		log.local('Connection server('+so.socketAddress+')...');
		_this.ws = new WebSocket(_this.socketAddress);
		_this.ws.onerror = _this.error;
		_this.ws.onopen = _this.onopen;
		_this.ws.onmessage = _this.onmessage;
		_this.ws.onclose = _this.onclose;
	},
	onopen :function(msg){
		log.local('Connect to the Server('+so.socketAddress+') successfully!');
		so.isConnectd = true;				
		so.reconnects = 0;
	},
	error : function(msg){
		//so.isConnectd = false;
		//so.reconnect();
	},
	onclose :function(msg){		
		var msg = 'Connect to the Server('+so.socketAddress+') failed!';
		log.local(msg);
		so.isConnectd = false;
		so.ws = null;	
		so.reconnect();
	},
	reconnect :function(){
		if(so.reconnects<=so.reconnect_max_num){
			log.local('Reconnect after '+so.reconnectSeconds+' seconds...');
			so.reconnectset = setTimeout(function(){so.connect();},so.reconnectSeconds*1000);
		}else{
			so.reconnects = 0;
			log.local('You cant input :connect command connect service');	
		}
	},
	send : function(msg){
		if(so.isConnectd){	
			so.ws.send(msg);
		}
		return so.isConnectd;	
	},
	notice:function(){
		//if(!focus.isFocus)
	},
	onmessage : function(event) {

		var data = eval('(' + event.data + ')');
		({
			'command' : function(){
				command[data['fun']].fun(data['user']); 
			},
			'init' : function(){	
				so.send(user.name);
				user.id = data['self_id']; 
				log.server(data);
				log.local('输入 :help 获取命令帮助');
			},
			'sys': function() {	
				log.server(data);
			},
			'img': function() {
				log.img(data);
				if(!focus.is()) { point.show(data['user'], '（发了一张图片）'); }
			},
			'user': function() {
				log.say(data);
				if(!focus.is()) { point.show(data['user'],data['message']); }
			},
		}[data['type']])();
		
	},
	init:function(socketAddress,reconnectSeconds){
		this.socketAddress = socketAddress;
		this.reconnectSeconds = reconnectSeconds || 5;
		
	}
};


// log
var log = {
	serverMsgColor : 'yellow',
	localMsgColor : '#80FFFF',
	REGX_HTML_ENCODE : /"|&|'|<|>|[\x00-\x20]|[\x7F-\xFF]|[\u0100-\u2700]/g,
	pre:[
		{
			'name' : '替换表情',
			'fun' :  'face.replaceFace'
		}
	],
	server:function(data){
		var str = '<span style="color:'+log.serverMsgColor+'">Server System : '+ data['message'] + ' ['+data['time']+']</span>';
		log.add(str); 
	},
	local:function(msg){
		var str = '<span style="color:'+log.localMsgColor+'">Local System : '+ msg + '</span>';
		log.add(str); 
	},
	say:function(data){
		var colors = color.color;
		var name = data['user'];
		if(user.id==data['id']){
			colors = user.color;
			name = user.name + '[我]';
		}

		var str = '<span style="color:'+colors+'">'+ name + ' : ' + log.encodeHtml(data['message']) + ' ['+data['time']+']</span>';

		for(var i in log.pre){
			if(typeof log.pre[i].fun == 'function' ){
				str = log.pre[i].fun(str); 
			}else{
				str = eval(log.pre[i].fun+'(\''+str+'\')');	
			}
		}

		log.add(str);
	},
	imgLoad:function(obj){
		if( obj.width>obj.height ){
			if( ui.chat.width() >= obj.width ){
				var width = obj.width;	
			}else{
				var width = ui.chat.width(); 	
			}

			var height = width/obj.width * obj.height;
		}else{
			if( ui.chat.height() >= obj.height ){
				var height = obj.height;	
			}else{
				var height = ui.chat.height(); 	
			}

			var width = height/obj.height * obj.width;				
		}	

		$(obj).parent().find('.loading').remove();
		$(obj).css({
			'height': height + 'px',	
			'width' : width + 'px'
		}).show();
	},
	img:function(data){
		var colors = color.color;
		var name = data['user'];
		if(user.id==data['id']){
			colors = user.color;
			name = user.name + '[我]';
		}

		var html = '<div><img class="loading" src="/static/loading.gif" /><img src="'+data['message']+'" style="display:none;" onload="log.imgLoad(this);" /></div>';
		var str = '<span style="color:'+colors+'">'+ name + ' : ' + html + ' ['+data['time']+']</span>';
		log.add(str);	
	},
	encodeHtml:function(s){
	      return (typeof s != "string") ? s :
		  s.replace(log.REGX_HTML_ENCODE,
			    function($0){
				var c = $0.charCodeAt(0), r = ["&#"];
				c = (c == 0x20) ? 0xA0 : c;
				r.push(c); r.push(";");
				return r.join("");
			    });
	},

	add:function(str){
		log.obj.append('<p>'+str+'</p>'); 
		log.obj.scrollTop(log.obj.get(0).scrollHeight);
	},
	clear:function(){
		this.obj.html('');	
	},
	init:function(str){
		this.obj = $(str);
		log.local('请输入您的昵称');
	}
};

// user类
var user = {
	name:'',		
	id:0,
	color:'#FFBB77'
};

// UI
var ui = {
	margin:10,
	getChatHeight:function(){
		return $(window).height() - (ui.input.height() + ui.margin*2 + 30);
	},
	getInputWidth:function(){ 
		return $(window).width() - (ui.margin * 2 + 2);
	},
	bind:function(){
		$(window).resize(function(){
			ui.chat.css({'height':ui.getChatHeight()+'px'});
		});
	},
	init:function(chat,input){
		var _this = this;
		_this.chat = $(chat); 
		_this.input = $(input); 
		_this.chat.css({'height':_this.getChatHeight()+'px','width':_this.getInputWidth()+'px','overflow-y':'auto'});	
		_this.input.css({'margin':_this.margin+'px','width':_this.getInputWidth()+'px'});
		_this.bind();
	}	
};

// face
var face = {
	faceFileMax:21,
	faceInfo:function(value){
		if(user.name && value.substr(0,1) !=':' && value.substr(-4) == 'face'){
			face.show();	
		}else{
			face.hide();	
		} 
	},
	replaceFace :function(str){ 
		var re = /face(\d{1,2})/g;				
		return str.replace(
			re,
			function(m,i){
				if( i >= 0 && i <= face.faceFileMax  ){
					return '<img src=\'/static/ico/'+i+'.gif\' />';
				}else{
					return m;	
				}

			}
		);
			 
	},
	ico:function(){
		var arr = [];
		for(var i=0;i<=face.faceFileMax;i++){
			arr.push('/static/ico/'+i+'.gif');	
		} 
		return arr;
	},
	show:function(){
		var _this = face; 

		$('#'+_this.id).css({
			'width' : ui.getInputWidth() + 'px',		
			'left' : ui.margin + 'px',
			'top' :  ( $(window).height() - $('#'+_this.id).height() - ui.input.height() * 2 ) + 'px'
		}).show();
	},
	hide:function(){
		$('#'+face.id).hide();
	},
	list:function(){
		var _this = this; 
	
		var ico = _this.ico();
		var html = '';
		var num = 0;
		for(var i in ico){
			html += num+'  <img src="'+ico[i]+'" /><br />';		
			num ++;
		}	     

		return html;
	},
	init:function(){
		var _this = this; 	

		_this.id = 'face';

		$('body').append('<div id="'+_this.id+'" style="display:none;border:1px solid #FFF;position:absolute;left:0;top:0;"></div>');

		var ico = _this.ico();
		
		var html = '<div class="bg" style="position:absolute;background:#fff;opacity:.7;left:0;top:0;width:100%;height:100%;z-index:-1;"></div>';

		html += '<div class="img" style="width:100%;height:100%;">';
		var num = 0;
		for(var i in ico){
			html += '<li style="list-style:none; float:left; margin:10px;">'+num+'.<img src="'+ico[i]+'" /></li>';		
			num++;
		}
		html += '</div>';	

		$('#'+_this.id).html(html);
	}
};

// color
var color = {
	bgColor:'#000',	
	color  :'#FFF',
	fun    : '',
	show   : function(fun){
		var _this = color;
		color.fun = fun;
		document.getElementById(_this.id).click();	
	},
	change:function(){
		if(typeof color.fun == 'function'){
			color.fun($(this).val());				
		}else{
			eval(color.fun+'(\''+$(this).val()+'\')');	
		}
	},
	init   : function(){
		var _this = this;
		_this.id = 'color';
		var html = '<input style="position:absolute;left:3000px;top:0;" id="'+_this.id+'" type="color" />';
		
		$('body').append(html);

		$('#'+_this.id).change(color.change);

	}
};

// drop
var drop = {
	bind:function(){
		var chat = ui.chat.get(0);

		chat.addEventListener("dragenter", function(e){
			e.stopPropagation();  
			e.preventDefault();  
		}, false);  

		chat.addEventListener("dragleave", function(e){
			e.stopPropagation();  
			e.preventDefault();  
		}, false);  

		chat.addEventListener("dragover",  function(e){
			e.stopPropagation();  
			e.preventDefault();  
		}, false);  

		chat.addEventListener("drop",function(e){
			e.stopPropagation();  
			e.preventDefault();
			if(user.id){
				drop.handleFiles(  e.dataTransfer.files );  
			}
		},false);

	},
	handleFiles:function(files){
		
		for (var i = 0; i < files.length; i++) {  
			if ( !files[i].type.match(/image.*/) ) {  
				continue;  
			}
			upload(files[i]).init();
		}	
	},
	init:function(){
	     var _this = this;
	     _this.bind();
	}		
};

// key
var hash = {
	range:[
		'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t',
		'u','w','v','x','y','z','1','2','3','4','5','6','7','8','9','0'
	],
	randint:function(n,m){
		var c = m-n+1;  
		return Math.floor(Math.random() * c + n);
	},
	randstr:function(){
		var _this = this;
		var len = _this.range.length - 1;
		
		return _this.range[ _this.randint( 0, len ) ];
	},
	key:function(leng){
		var len = leng || 64;

		var randstr = [];
		for(var i = 0; i<len; i++){
			randstr.push( hash.randstr() );	
		}

		return randstr.join('');
	}
};

// upload
var upload = function(file){
	var F = function(){
		this.key = hash.key();
		this.file = file;
	};

	F.prototype = upload.prototype;

	return new F();
};

upload.prototype = {
	url:'',
	send:function(file){	
		var _this = this;
		var fd = new FormData();
		fd.append("file", file);
		fd.append('filename', _this.filename);
		var xhr = new XMLHttpRequest();
		xhr.upload.addEventListener("progress", function(e){  _this.uploadProgress(e);  } , false );
		xhr.addEventListener("load",  function(e){ _this.uploadSuccess( e );  }  , false);
		xhr.addEventListener("error", function(e){ _this.uploadFailed(e); }, false);
		xhr.addEventListener("abort", function(e){ _this.uploadCanceled(e); }, false);
		xhr.open("POST", _this.url, false);
		xhr.send(fd);		
	},
	uploadCanceled:function(e){
		var _this = this;
	       	return false;
	},
	uploadFailed:function(e){
		var _this = this;
		return false;
	},
	uploadProgress:function( e ){
		var _this = this;
		if (e.lengthComputable) {
			var percentComplete = parseInt( Math.round(e.loaded / e.total * 100), 10);
			_this.handleProgress( percentComplete );
		}
	},
	uploadSuccess:function(e){
		var _this = this;
		var result = eval('('+ e.currentTarget.response +')');
		if( result.error === 0 ){
			chat.send( _this.filename );
		}else{
			log.local(result.msg);	
		}
		
		_this.handleProgress(100);	
	},
	handleProgress:function(num){
		var _this = this;
		var height = Math.abs(100 - num);
	
		if(height == 0){
			$('#'+_this.key).find('div').remove();
		}else{
			$('#'+_this.key).find('div').css({
				'height' : height + '%'	
			});
		}
	},
	html:function(obj){
		var _this = this;
		
		if( obj.width>obj.height ){
			if( ui.chat.width() >= obj.width ){
				var width = obj.width;	
			}else{
				var width = ui.chat.width(); 	
			}

			var height = width/obj.width * obj.height;
		}else{
			if( ui.chat.height() >= obj.height ){
				var height = obj.height;	
			}else{
				var height = ui.chat.height(); 	
			}

			var width = height/obj.height * obj.width;				
		}

		$(obj).css({
			'width':width+'px',	
			'height':height+'px',
			'position':'relative'
		}).parent().show();

		_this.send(_this.file);
	},
	init:function(){
		var _this = this;
		var reader = new FileReader(); 
		var pathinfo = _this.file.name.split('.');	
		_this.filename = _this.key + '.' + pathinfo[pathinfo.length-1];
		reader.onload = function(e){
			var myDate = new Date();
			var html = '';	
			html += '<span style="color:'+user.color+';">' + user.name + '[我] ：</span>';
			html += '<div id="'+_this.key+'" style="display:none;position:relative;">';
				html += '<div style="width:100%;height:100%;position:absolute;z-index:999;opacity:0.7;background:#000;top:0;left:0;"></div>';
				html += '<img src="'+e.target.result+'" />';
			html += '</div>';
			html += '['+myDate.getHours()+ ':' + myDate.getMinutes() + ':' + myDate.getSeconds() +']';
			log.add(html);
			$('#'+_this.key).find('img').get(0).onload = function(){ _this.html(this); };
		};	
		reader.readAsDataURL( _this.file); 
	}		
};

// init;
$(document).ready(function(){
	ui.init('#message','#action');
	//so.init('ws://192.168.1.99:8888/websocket');
	so.init('ws://50.116.7.117:8888/websocket');
	focus.init();
	log.init('#message');
	point.init();
	chat.init('#chat');
	face.init();
	color.init();
	upload.prototype.url = 'upload';
	drop.init();
});
