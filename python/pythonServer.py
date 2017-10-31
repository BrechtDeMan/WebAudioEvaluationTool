#!/usr/bin/python

# Detect the Python version to switch code between 2.x and 3.x
# http://stackoverflow.com/questions/9079036/detect-python-version-at-runtime
import sys

import inspect
import os
import pickle
import datetime
import operator
import xml.etree.ElementTree as ET
import copy
import string
import random
import errno

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

try:
    os.makedirs("../saves")
except OSError as e:
    if e.errno != errno.EEXIST:
        raise

PSEUDO_PATH = '../tests/'
pseudo_files = []
pseudo_index = 0
for filename in os.listdir(PSEUDO_PATH):
    print(filename)
    if filename.endswith('.xml'):
        pseudo_files.append(filename)

curSaveIndex = 0;
curFileName = 'test-0.xml'
while(os.path.isfile('../saves/'+curFileName)):
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
        fmt = fmt[len(fmt)-1]
        fpath = "../"+urllib2.unquote(s.path)
        size = os.path.getsize(fpath)
        fileDump = open(fpath, mode='rb')
        s.send_response(200)

        if (fmt == 'html'):
            s.send_header("Content-type", 'text/html')
        elif (fmt == 'css'):
            s.send_header("Content-type", 'text/css')
        elif (fmt == 'js'):
            s.send_header("Content-type", 'application/javascript')
        else:
            s.send_header("Content-type", 'application/octet-stream')
        fileRead = fileDump.read()
        s.send_header("Content-Length", len(fileRead))
        s.end_headers()
        s.wfile.write(fileRead)
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
    
def requestKey(s):
    reply = ""
    key = ''
    while key == '':
        tempKey = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(32));
        if (os.path.isfile("saves/save-"+tempKey+".xml") == False):
            key = tempKey
    options = s.path.rsplit('?')
    options = options[1].rsplit('&')
    for option in options:
        optionPair = option.rsplit('=')
        if optionPair[0] == "saveFilenamePrefix":
            prefix = optionPair[1]
    if prefix == None:
        prefix = "save"
    s.send_response(200)
    s.send_header("Content-type", "application/xml");
    s.end_headers()
    reply = "<response><state>OK</state><key>"+key+"</key></response>"
    if sys.version_info[0] == 2:
        s.wfile.write(reply)
    elif sys.version_info[0] == 3:
        s.wfile.write(bytes(reply, "utf-8"))
    file = open("../saves/"+prefix+"-"+key+".xml",'w')
    file.write("<waetresult key=\""+key+"\"/>")
    file.close()
    

def saveFile(self):
    global curFileName
    global curSaveIndex
    options = self.path.rsplit('?')
    options = options[1].rsplit('&')
    update = False
    for option in options:
        optionPair = option.rsplit('=')
        if optionPair[0] == "key":
            key = optionPair[1]
        elif optionPair[0] == "saveFilenamePrefix":
            prefix = optionPair[1]
        elif optionPair[0] == "state":
            update = optionPair[1] == "update"
    if key == None:
        self.send_response(404)
        return
    if prefix == None:
        prefix = "save"
    varLen = int(self.headers['Content-Length'])
    postVars = self.rfile.read(varLen)
    print("Saving file key "+key)
    filename = prefix+'-'+key+'.xml'
    if update:
        filename = "update-"+filename
    file = open('../saves/'+filename,'wb')
    file.write(postVars)
    file.close()
    try:
        wbytes = os.path.getsize('../saves/'+filename)
    except OSError:
        self.send_response(200)
        self.send_header("Content-type", "text/xml")
        self.end_headers()
        self.wfile.write('<response state="error"><message>Could not open file</message></response>')
    self.send_response(200)
    self.send_header("Content-type", "text/xml")
    self.end_headers()
    reply = '<response state="OK"><message>OK</message><file bytes="'+str(wbytes)+'">"saves/'+filename+'"</file></response>'
    if sys.version_info[0] == 2:
        self.wfile.write(reply)
    elif sys.version_info[0] == 3:
        self.wfile.write(bytes(reply, "utf-8"))
    curSaveIndex += 1
    curFileName = 'test-'+str(curSaveIndex)+'.xml'
    if update == False:
        if(os.path.isfile("../saves/update-"+filename)):
            os.remove("../saves/update-"+filename)
    
def testSave(self):
    self.send_response(200)
    self.send_header("Content-type", "text/xml")
    self.end_headers()
    filename = "../saves/test-save.xml"
    file = open(filename,'wb')
    if sys.version_info[0] == 2:
        file.write("<xml></xml>")
    elif sys.version_info[0] == 3:
        file.write(bytes("<xml></xml>", "utf-8"))
    file.close()
    message = ""
    try:
        wbytes = os.path.getsize(filename)
    except OSError:
        message = '<response state="error"><message>Could not open file</message></response>';
        if sys.version_info[0] == 2:
            self.wfile.write(message)
        elif sys.version_info[0] == 3:
            self.wfile.write(bytes(message, "utf-8"))
        return
    os.remove(filename)
    message = '<response state="OK"><message>OK</message></response>';
    if sys.version_info[0] == 2:
        self.wfile.write(message)
    elif sys.version_info[0] == 3:
        self.wfile.write(bytes(message, "utf-8"))

def poolXML(s):
    pool = ET.parse('../tests/pool.xml')
    root = pool.getroot()
    setupNode = root.find("setup");
    poolSize = setupNode.get("poolSize",0);
    if (poolSize == 0):
        s.path = s.path.split("/php",1)[0]+"/tests/pool/xml"
        processFile(s)
        return
    poolSize = int(poolSize)
    # Set up the store will all the test page key nodes
    pages = {};
    for page in root.iter("page"):
        id = page.get("id")
        pages[id] = 0
    # Read the saves and determine the completed pages
    for filename in os.listdir("../saves/"):
        if filename.endswith(".xml"):
            save = ET.parse("../saves/"+filename)
            save_root = save.getroot();
            if (save_root.find("waet").get("url") == "http://localhost:8000/php/pool.php"):
                for page in save_root.findall("./page"):
                    id = page.get("ref")
                    pages[id] = pages[id] + 1

    # Sort the dictionary
    rot_pages = {}
    for key, value in pages.items():
        if (value in rot_pages):
            rot_pages[value].append(key)
        else:
            rot_pages[value] = [key]
            
    Keys = list(rot_pages)
    print ("Current pool state:")
    print (rot_pages)
    
    return_node = ET.fromstring('<waet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="test-schema.xsd"/>');
    return_node.append(copy.deepcopy(root.find("setup")))
    page_elements = root.findall("page")

    # Now append the pages
    i = 0
    while(len(return_node.findall("page")) < poolSize):
        if (i > 0):
            for page in return_node.iter("page"):
                page.set("alwaysInclude","true")
        for id in rot_pages[Keys[i]]:
            return_node.append(copy.deepcopy(root.find('./page[@id="'+id+'"]')))
        i=i+1
    s.send_response(200)
    s.send_header("Content-type", "text/xml")
    s.end_headers()
    s.wfile.write(ET.tostring(return_node))
        
def http_do_HEAD(s):
    s.send_response(200)
    s.send_header("Content-type", "text/html")
    s.end_headers()

def http_do_GET(request):
    global pseudo_index
    if(request.client_address[0] == "127.0.0.1"):
        if (request.path == "/favicon.ico"):
            send404(request)
        elif (request.path.split('?',1)[0] == "/php/requestKey.php"):
            requestKey(request);
        elif (request.path.split('?',1)[0] == "/php/pool.php"):
            poolXML(request);
        elif (request.path.split('?',1)[0] == "/php/test_write.php"):
            testSave(request);
        else:
            request.path = request.path.split('?',1)[0]
            if (request.path == '/'):
                request.path = '/index.html'
            elif (request.path == '/pseudo.xml'):
                request.path = PSEUDO_PATH + pseudo_files[pseudo_index]
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
