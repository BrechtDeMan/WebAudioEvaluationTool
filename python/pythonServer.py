#!/usr/bin/python

# Detect the Python version to switch code between 2.x and 3.x
# http://stackoverflow.com/questions/9079036/detect-python-version-at-runtime
import sys

from os import walk
from os import path
from os import listdir
import inspect
import os
import pickle
import datetime

if sys.version_info[0] == 2:
    # Version 2.x
    import BaseHTTPServer
    import urllib2
    import urlparse
elif sys.version_info[0] == 3:
    # Version 3.x
    from http.server import BaseHTTPRequestHandler, HTTPServer
    import urllib as urllib2

# Go to right folder. 
scriptdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe()))) # script directory
os.chdir(scriptdir) # does this work?

PSEUDO_PATH = '../tests/'
pseudo_files = []
for filename in listdir(PSEUDO_PATH):
    print(filename)
    if filename.endswith('.xml'):
        pseudo_files.append(filename)

curSaveIndex = 0;
curFileName = 'test-0.xml'
while(path.isfile('../saves/'+curFileName)):
    curSaveIndex += 1;
    curFileName = 'test-'+str(curSaveIndex)+'.xml'

if len(pseudo_files) > 0:
    pseudo_index = curSaveIndex % len(pseudo_files)
else:
    pseudo_index = 0

print('URL: http://localhost:8000/index.html')

def send404(s):
    s.send_response(404)
    s.send_header("Content-type", "text/html")
    s.end_headers()
	
def processFile(s):
    if sys.version_info[0] == 2:
        s.path = s.path.rsplit('?')
        s.path = s.path[0]
        s.path = s.path[1:len(s.path)]
        st = s.path.rsplit(',')
        lenSt = len(st)
        fmt = st[lenSt-1].rsplit('.')
        fpath = "../"+urllib2.unquote(s.path)
        size = path.getsize(fpath)
        fileDump = open(fpath)
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
    elif sys.version_info[0] == 3:
        s.path = s.path.rsplit('?')
        s.path = s.path[0]
        s.path = s.path[1:len(s.path)]
        st = s.path.rsplit(',')
        lenSt = len(st)
        fmt = st[lenSt-1].rsplit('.')
        fpath = "../"+urllib2.parse.unquote(s.path)
        s.send_response(200)
        if (fmt[1] == 'html'):
            s.send_header("Content-type", 'text/html')
            fileDump = open(fpath, encoding='utf-8')
            fileBytes = bytes(fileDump.read(), "utf-8")
            fileDump.close()
        elif (fmt[1] == 'css'):
            s.send_header("Content-type", 'text/css')
            fileDump = open(fpath, encoding='utf-8')
            fileBytes = bytes(fileDump.read(), "utf-8")
            fileDump.close()
        elif (fmt[1] == 'js'):
            s.send_header("Content-type", 'application/javascript')
            fileDump = open(fpath, encoding='utf-8')
            fileBytes = bytes(fileDump.read(), "utf-8")
            fileDump.close()
        else:
            s.send_header("Content-type", 'application/octet-stream')
            fileDump = open(fpath, 'rb')
            fileBytes = fileDump.read()
            fileDump.close()
        s.send_header("Content-Length", len(fileBytes))
        s.end_headers()
        s.wfile.write(fileBytes)

def keygen(s):
	reply = ""
	options = s.path.rsplit('?')
	options = options[1].rsplit('=')
	key = options[1]
	print("Registered key "+key)
	if os.path.isfile("saves/save-"+key+".xml"):
		reply = "<response><state>NO</state><key>"+key+"</key></response>"
	else:
		reply = "<response><state>OK</state><key>"+key+"</key></response>"
	s.send_response(200)
	s.send_header("Content-type", "application/xml")
	s.end_headers()
	s.wfile.write(bytes(reply, "utf-8"))
	file = open("../saves/save-"+key+".xml",'w')
	file.write("<waetresult key="+key+"/>")
	file.close();

def saveFile(self):
    global curFileName
    global curSaveIndex
    options = self.path.rsplit('?')
    options = options[1].rsplit('=')
    key = options[1]
    varLen = int(self.headers['Content-Length'])
    postVars = self.rfile.read(varLen)
    print("Saving file key "+key)
    file = open('../saves/save-'+key+'.xml','wb')
    file.write(postVars)
    file.close()
    try:
        wbytes = os.path.getsize('../saves/save-'+key+'.xml')
    except OSError:
        self.send_response(200)
        self.send_header("Content-type", "text/xml")
        self.end_headers()
        self.wfile.write('<response state="error"><message>Could not open file</message></response>')
    self.send_response(200)
    self.send_header("Content-type", "text/xml")
    self.end_headers()
    reply = '<response state="OK"><message>OK</message><file bytes="'+str(wbytes)+'">"saves/'+curFileName+'"</file></response>'
    self.wfile.write(bytes(reply, "utf-8"))
    curSaveIndex += 1
    curFileName = 'test-'+str(curSaveIndex)+'.xml'

def http_do_HEAD(s):
    s.send_response(200)
    s.send_header("Content-type", "text/html")
    s.end_headers()

def http_do_GET(request):
    if(request.client_address[0] == "127.0.0.1"):
        if (request.path == "/favicon.ico"):
            send404(request)
        elif (request.path.split('?',1)[0] == "/php/keygen.php"):
            keygen(request);
        else:
            request.path = request.path.split('?',1)[0]
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

def http_do_POST(request):
    if(request.client_address[0] == "127.0.0.1"):
        if (request.path.rsplit('?',1)[0] == "/save" or request.path.rsplit('?',1)[0] == "/php/save.php"):
            saveFile(request)
        else:
            send404(request)

if sys.version_info[0] == 2:
    class MyHandler(BaseHTTPServer.BaseHTTPRequestHandler):
        def do_HEAD(s):
            http_do_HEAD(s)
        def do_GET(request):
            http_do_GET(request)
        def do_POST(request):
            http_do_POST(request)
    def run(server_class=BaseHTTPServer.HTTPServer,handler_class=MyHandler):
        server_address = ('', 8000)
        httpd = server_class(server_address, handler_class)
        httpd.serve_forever()
    run()
elif sys.version_info[0] == 3:
    class MyHandler(BaseHTTPRequestHandler):
        def do_HEAD(s):
            send404(s)
        def do_GET(request):
            http_do_GET(request)
        def do_POST(request):
            http_do_POST(request)
    def run(server_class=HTTPServer,handler_class=MyHandler):
        server_address = ('', 8000)
        httpd = server_class(server_address, handler_class)
        httpd.serve_forever()
    run()
