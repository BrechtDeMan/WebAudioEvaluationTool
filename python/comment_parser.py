#!/usr/bin/python
# -*- coding: utf-8 -*-

import xml.etree.ElementTree as ET
import os
import csv
import sys

# COMMAND LINE ARGUMENTS

assert len(sys.argv)<3, "comment_parser takes at most 1 command line argument\n"+\
                        "Use: python comment_parser.py [rating_folder_location]"

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves"    # Looks in 'saves/' folder from 'scripts/' folder
    print("Use: python comment_parser.py [XML_files_location]")
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


# CODE

# remember which files have been opened this time
file_history = []

# get every XML file in folder
for file in os.listdir(folder_name): 
    if file.endswith(".xml"):
        tree = ET.parse(folder_name + '/' + file)
        root = tree.getroot()
        
        # get list of all page names
        for audioholder in root.findall("./page"):   # iterate over pages
            page_name = audioholder.get('ref')               # get page name
            
            if page_name is None: # ignore 'empty' audio_holders
                print("WARNING: " + file + " contains empty page.")
                break
                
            if audioholder.get("state") != "complete":
                print("WARNING: " + file + "test page " + page_name + " is not complete, skipping.")
            else:
                # create folder [page_name] if not yet created
                if not os.path.exists(folder_name + "/" + page_name):
                    os.makedirs(folder_name + "/" + page_name)

                # for page [page_name], print comments related to fragment [id]
                for audioelement in audioholder.findall("./audioelement"):
                    if audioelement is not None and audioelement.get('type') != "outside-reference":
                        audio_id = str(audioelement.get('ref'))

                        csv_name = folder_name +'/' + page_name+'/'+page_name+'-comments-'+audio_id+'.csv'

                        # If file hasn't been opened yet this time, empty
                        if csv_name not in file_history:
                            csvfile = open(csv_name, 'w')
                            file_history.append(csv_name) # remember this file has been written to this time around
                        else: 
                            # append (!) to file [page_name]/[page_name]-comments-[id].csv
                            csvfile = open(csv_name, 'a')
                        writer = csv.writer(csvfile, 
                                            delimiter=',', 
                                            dialect="excel",
                                            quoting=csv.QUOTE_ALL)
                        try:
                            commentstr = audioelement.find("./comment/response").text
                        except AttributeError:
                            commentstr = ""
                        valuestr = audioelement.find("./value").text

                        if commentstr is None:
                           commentstr = ''
                        if valuestr is None:
                           valuestr = ''

                        # anonymous comments:
                        # writer.writerow([commentstr.encode("utf-8")])
                        # comments with (file) name:
                        writer.writerow([file[:-4]] + [valuestr] + [commentstr.encode("utf-8")]) 

                    #TODO Replace 'new line' in comment with something else?
                        
# PRO TIP: Change from csv to txt by running this in bash: 
# $ cd folder_where_csvs_are/
# $ for i in *.csv; do mv "$i" "${i/.csv}".txt; done
