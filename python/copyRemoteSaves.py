#!/usr/bin/python

import xml.etree.ElementTree as ET
import os
import sys
from lxml import html
import requests


url = input('Where is the remote WAET URL? ')
output = input('Where am I saving all these? (Provide the full path using pwd to the saves directory) ')
if output.endswith('/') == False:
    output = output + '/'
if url.endswith('/saves/') == False and url.endswith('/saves') == False:
    if url.endswith('/') == False:
        url = url + '/'
    url = url + 'saves'
print(url)
page = requests.get(url)
tree = html.fromstring(page.content)
print(tree)
ahref = tree.xpath('//a/text()')
for a in ahref:
    if a.endswith('.xml'):
        r = requests.get(url+a, allow_redirects=True)
        open(output+a, 'wb').write(r.content)
print(ahref)