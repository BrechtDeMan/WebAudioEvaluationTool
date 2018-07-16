#!/usr/bin/python

import xml.etree.ElementTree as ET
import os
import sys
import csv

# COMMAND LINE ARGUMENTS

assert len(sys.argv)<3, "commentquestion_parser takes at most 1 command line argument\nUse: python commentquestion_parser.py [rating_folder_location]"

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves"    # Looks in 'saves/' folder from 'scripts/' folder
    print("Use: python commentquestion_parser.py [rating_folder_location]")
    print("Using default path: " + folder_name)
elif len(sys.argv) == 2:
    folder_name = sys.argv[1]   # First command line argument is folder

# check if folder_name exists
if not os.path.exists(folder_name):
    #the file is not there
    print("Folder '"+folder_name+"' does not exist.")
    sys.exit() # terminate script execution
elif not os.access(os.path.dirname(folder_name), os.W_OK):
    #the file does exist but write privileges are not given
    print("No write privileges in folder '"+folder_name+"'.")

# create folder 'ratings' if not yet created
if not os.path.exists(folder_name + '/comments'):
    os.makedirs(folder_name + '/comments')
    
pagestore = {}

for filename in os.listdir(folder_name):
    if (filename.endswith(".xml")):
        tree = ET.parse(folder_name + '/' + filename)
        root = tree.getroot()
        
        subject_id = root.get('key');
        
        # get the list of pages
        for page in root.findall("./page"):
            pagename = page.get("ref")
            trackname = page.find('audioelement').get('ref')
            if pagename is None: # ignore 'empty' audio_holders
                print("WARNING: " + filename + " contains empty audio holder. (commentquestion_parser.py)")
                break
                
            if page.get('state') != "complete":
                print("WARNING: " + filename + " contains incomplete page " +pagename+ ". (commentquestion_parser.py)")
                break
            try:
                questionStore = pagestore[pagename]
            except KeyError:
                questionStore = {}
                pagestore[pagename] = questionStore
            
            for cq in page.findall("./comment"):
                cqid = cq.get("id");
                response = cq.find("./response").text
                try:
                    commentStore = questionStore[cqid]
                except KeyError:
                    commentStore = [];
                    questionStore[cqid] = commentStore
                commentStore.append({"subject": subject_id, "value": response, "trackName": trackname})

for page in pagestore.keys():
	print page
	pagedir = folder_name + '/comments/'+page
	if not os.path.exists(pagedir):
	    os.makedirs(pagedir)
	for comment in pagestore[page].keys():
		with open(pagedir+"/"+comment+".csv", "w") as csvfile:
			filewriter = csv.writer(csvfile, delimiter=',')
			filewriter.writerow(("save_id", "value", "trackName"))
			for entry in pagestore[page][comment]:
				filewriter.writerow((entry["subject"], entry["value"], entry["trackName"]))