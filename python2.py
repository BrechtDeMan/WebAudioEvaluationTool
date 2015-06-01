import BaseHTTPServer
from os import walk
from os import path
import urllib2
import pickle
import datetime

curSaveIndex = 0;
curFileName = 'test-0.xml'
while(path.isfile('saves/'+curFileName)):
	curSaveIndex += 1;
	curFileName = 'test-'+str(curSaveIndex)+'.xml'

print curFileName

def send404(s):
	s.send_response(404)
	s.send_header("Content-type", "text/html")
	s.end_headers()
	
def processFile(s):
	s.path = s.path[1:len(s.path)]
	st = s.path.rsplit(',')
	lenSt = len(st)
	fmt = st[lenSt-1].rsplit('.')
	size = path.getsize(urllib2.unquote(s.path))
	fileDump = open(urllib2.unquote(s.path))
	s.send_response(200)
	
	if (fmt[1] == 'html'):
		s.send_header("Content-type", 'text/html')
	elif (fmt[1] == 'css'):
		s.send_header("Content-type", 'text/css')
	elif (fmt[1] == 'js'):
		s.send_header("Content-type", 'application/javascript')
	else:
		s.send_header("Content-type", 'application/octet-stream')
	s.send_header("Content-Length", size)
	s.end_headers()
	s.wfile.write(fileDump.read())
	fileDump.close()
	
def saveFile(self):
	global curFileName
	global curSaveIndex
	varLen = int(self.headers['Content-Length'])
	postVars = self.rfile.read(varLen)
	print curFileName
	file = open('saves/'+curFileName,'w')
	curSaveIndex += 1;
	curFileName = 'test-'+str(curSaveIndex)+'.xml'
	print curFileName
	file.write(postVars)
	file.close()
	self.send_response(200)
	self.send_header("Content-type", "text/xml")
	self.end_headers()
	self.wfile.write('<response><state>OK</state><file>saves/'+curFileName+'</file></response>')

class MyHandler(BaseHTTPServer.BaseHTTPRequestHandler):
	def do_HEAD(s):
			s.send_response(200)
			s.send_header("Content-type", "text/html")
			s.end_headers()
	def do_GET(request):
		if(request.client_address[0] == "127.0.0.1"):
			if (request.path == "/favicon.ico"):
				send404(request)
			else:
				if (request.path == '/'):
					request.path = '/index.html'
				processFile(request)
		else:
			send404(request)
	def do_POST(request):
		if(request.client_address[0] == "127.0.0.1"):
			if (request.path == "/save"):
				saveFile(request)
		else:
			send404(request)

def run(server_class=BaseHTTPServer.HTTPServer,
        handler_class=MyHandler):
    server_address = ('', 8000)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()

run()