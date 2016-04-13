from http.server import BaseHTTPRequestHandler, HTTPServer
from os import walk
from os import path
from os import listdir
import inspect
import os
import urllib as urllib2
import pickle
import datetime

# Go to right folder. 
scriptdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe()))) # script directory
os.chdir(scriptdir) # does this work?

PSEUDO_PATH = 'example_eval/'
pseudo_files = []
for filename in listdir(PSEUDO_PATH):
    if filename.endswith('.xml'):
        pseudo_files.append(filename)

curSaveIndex = 0;
curFileName = 'test-0.xml'
while(path.isfile('saves/'+curFileName)):
	curSaveIndex += 1;
	curFileName = 'test-'+str(curSaveIndex)+'.xml'

pseudo_index = curSaveIndex % len(pseudo_files)

print('URL: http://localhost:8000/index.html')

def send404(s):
	s.send_response(404)
	s.send_header("Content-type", "text/html")
	s.end_headers()
	
def processFile(s):
	s.path = s.path.rsplit('?')
	s.path = s.path[0]
	s.path = s.path[1:len(s.path)]
	st = s.path.rsplit(',')
	lenSt = len(st)
	fmt = st[lenSt-1].rsplit('.')
	s.send_response(200)
	if (fmt[1] == 'html'):
		s.send_header("Content-type", 'text/html')
		fileDump = open(urllib2.parse.unquote(s.path), encoding='utf-8')
		fileBytes = bytes(fileDump.read(), "utf-8")
		fileDump.close()
	elif (fmt[1] == 'css'):
		s.send_header("Content-type", 'text/css')
		fileDump = open(urllib2.parse.unquote(s.path), encoding='utf-8')
		fileBytes = bytes(fileDump.read(), "utf-8")
		fileDump.close()
	elif (fmt[1] == 'js'):
		s.send_header("Content-type", 'application/javascript')
		fileDump = open(urllib2.parse.unquote(s.path), encoding='utf-8')
		fileBytes = bytes(fileDump.read(), "utf-8")
		fileDump.close()
	else:
		s.send_header("Content-type", 'application/octet-stream')
		fileDump = open(urllib2.parse.unquote(s.path), 'rb')
		fileBytes = fileDump.read()
		fileDump.close()
	s.send_header("Content-Length", len(fileBytes))
	s.end_headers()
	s.wfile.write(fileBytes)
	
def saveFile(self):
	global curFileName
	global curSaveIndex
	varLen = int(self.headers['Content-Length'])
	postVars = self.rfile.read(varLen)
	print(curFileName)
	file = open('saves/'+curFileName,'w')
	file.write(postVars.decode("utf-8"))
	file.close()
	try:
		wbytes = os.path.getsize('saves/'+curFileName)
	except OSError:
		self.send_response(200)
		self.send_header("Content-type", "text/xml")
		self.end_headers()
		self.wfile.write('<response state="error"><message>Could not open file</message></response>')
	self.send_response(200)
	self.send_header("Content-type", "text/xml")
	self.end_headers()
	self.wfile.write(bytes('<response state="OK"><message>OK</message><file bytes="'+str(wbytes)+'">"saves/'+curFileName+'"</file></response>','utf-8'))
	curSaveIndex += 1
	curFileName = 'test-'+str(curSaveIndex)+'.xml'

class MyHandler(BaseHTTPRequestHandler):
	def do_HEAD(s):
		s.send_response(200)
		s.send_header("Content-type", "text/html")
		s.end_headers()
	def do_GET(request):
		global pseudo_index
		global pseudo_files
		global PSEUDO_PATH
		if(request.client_address[0] == "127.0.0.1"):
			if (request.path == "/favicon.ico"):
				send404(request)
			else:
				if (request.path == '/'):
					request.path = '/index.html'
				elif (request.path == '/pseudo.xml'):
					request.path = '/'+PSEUDO_PATH + pseudo_files[pseudo_index]
					print(request.path)
					pseudo_index += 1
					pseudo_index %= len(pseudo_files)
				processFile(request)
		else:
			send404(request)

	def do_POST(request):
		if(request.client_address[0] == "127.0.0.1"):
			if (request.path == "/save" or request.path == "/save.php"):
				saveFile(request)
		else:
			send404(request)

def run(server_class=HTTPServer,
        handler_class=MyHandler):
    server_address = ('', 8000)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()

run()
