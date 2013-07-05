# encoding=utf-8
import tornado.ioloop
import tornado.web
import tornado.websocket
import json
import time
import HTMLParser
import Image
import tempfile
import json
import socket 
import fcntl 
import struct
import re
import os


class MainHandler(tornado.web.RequestHandler):
    	def get(self):
        	self.write("Hello, world")


class web(tornado.websocket.WebSocketHandler):
	clients = set()
	user = {}

	@staticmethod
	def send_to_all(message):
		for c in web.clients:
			c.write_message(message)
	@staticmethod
	def send_to_all_notme(message, self):
		for c in web.clients:
			if c == self: continue
			c.write_message(message)


	def open(self):
		date = time.strftime("%H:%M:%S", time.localtime())
		self.write_message(json.dumps({
			'type': 'init',
			'self_id': id(self),
			'message': u'Welcome to Web Chat Author by LiZhong!',
			'time' : date,
		}))

	def on_close(self):
		date = time.strftime("%H:%M:%S", time.localtime())
		web.clients.remove(self)

		if web.user.has_key(id(self)):
			username = web.user[id(self)]['user']
		else:
			username = 'None'

		web.send_to_all({
			'type': 'sys',
			'message': username + u' Get out',
			'time' : date,
		})

		del web.user[id(self)]

	def on_message(self, message):
		
		date = time.strftime("%H:%M:%S", time.localtime())
		user_id = id(self)
		if web.user.has_key(user_id):	
			if message == ':who':
				self.write_message(json.dumps({
					'type': 'command',
					'fun' : 'who',
					'user': web.user,
				}))
			elif message.split()[0] == ':img':
				if not message.split()[1]:return False

				if web.user.has_key(user_id):
					username = web.user[user_id]['user']
				else:
					username = 'None'

				web.send_to_all({
					'type': 'img',
					'id': user_id,
					'user' : username,
					'message':  message.split()[1],
					'time' : date,
				})			

			elif re.match(r'\w{64}\.(jpg|jpeg|png|gif)' , message) and os.path.exists('./static/upload/'+message):
				message = '/static/upload/'+message
				if web.user.has_key(user_id):
					username = web.user[user_id]['user']
				else:
					username = 'None'

				web.send_to_all_notme({
					'type': 'img',
					'id': user_id,
					'user' : username,
					'message':  message,
					'time' : date,
				},self)				

			else:
				if web.user.has_key(user_id):
					username = web.user[user_id]['user']
				else:
					username = 'None'

				web.send_to_all({
					'type': 'user',
					'id': user_id,
					'user' : username,
					'message':  message,
					'time' : date,
				})
		else:
			web.user[user_id] = {'user' : message,'time':date }
			web.send_to_all({
				'type': 'sys',
				'message': message + u' Come in',
				'time' : date,
			})
			
			web.clients.add(self)

		print web.user

class Upload(tornado.web.RequestHandler):
	def get(self):
		self.html({'error' : 1, 'msg' : u'Access Error!'})

	def post(self):
		myfile = self.request.files.get('file')
		filename = self.get_argument('filename', False)

		if not filename : 
			self.html({'error' : 1, 'msg' : u'缺少filename参数'})
			return False

     		image_type_list = ['image/gif', 'image/jpeg','image/pjpeg', 'image/bmp', 'image/png', 'image/x-png']	

		if myfile is None:
			self.html({'error' : 1, 'msg' : u'请选择图片'})
			return False
			
		for f in myfile:
			if f['content_type'] not in image_type_list:
				self.html({'error' : 1, 'msg' : u'图片类型错误'})
				return False
		
			# write a file
			tf = tempfile.NamedTemporaryFile()
			tf.write(f['body'])
			tf.seek(0)
			
			# create normal file
          		try:
				img = Image.open(tf.name)
	          	except IOError, error:
	               		self.html({'error' : 1, 'msg' : u'图片不合法'})
	               		return False
			
			img.save("./static/upload/" + filename )
			tf.close()
			self.html({'error' : 0, 'msg' : u'上传成功'})
	
	def html(self,result):
		print result
		self.write(json.dumps( result ,separators=(',',':')))
		#html = '<script type="text/javascript">window.parent.CKEDITOR.tools.callFunction('+str(fn)+', \''+fileurl+'\', \''+msg+'\');</script>' 
		#html = '<script type="text/javascript">alert(\''+str(fn)+', '+fileurl+', '+msg+'\');</script>' 
		#self.write(html) 

class Index(tornado.web.RequestHandler):
	def get(self):
		self.render('web.html')

class Other(tornado.web.RequestHandler):
	def get(self, s):
		self.write('error!')

	def ip(self, ifname):
		s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM) 
		return socket.inet_ntoa(fcntl.ioctl( 
			s.fileno(), 
			0x8915,
			struct.pack('256s', ifname[:15]) 
		)[20:24]) 
		
settings = {
	'static_path' : os.path.join(os.getcwd(),"static"),
}

application = tornado.web.Application([
	(r"/", Index ),
	(r"/websocket", web),
	(r"/upload", Upload),
	(r"/(.*?)", Other),
], **settings )

if __name__ == "__main__":
	application.listen(8888)
	tornado.ioloop.IOLoop.instance().start()
