#!/usr/bin/python

import xml.etree.ElementTree as ET
import os
import sys
import csv
import re

# COMMAND LINE ARGUMENTS

assert len(sys.argv)<3, "score_parser takes at most 1 command line argument\n"+\
                        "Use: python score_parser.py [rating_folder_location]"

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves"    # Looks in 'saves/' folder from 'scripts/' folder
    print("Use: python score_parser.py [rating_folder_location]")
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

storage = {}

# create folder 'ratings' if not yet created
if not os.path.exists(folder_name + '/ratings'):
    os.makedirs(folder_name + '/ratings')

# Get every XML file in the folder
for file_name in os.listdir(folder_name):
    if (file_name.endswith(".xml")):
        tree = ET.parse(folder_name + '/' + file_name)
        root = tree.getroot()
        
        subject_id = root.get('key');
        
        # get the list of the pages this subject evaluated
        for page in root.findall("./page"):     # iterate over pages
            page_name = page.get('ref') # get page ID
            
            if page_name is None: # ignore 'empty' audio_holders
                print("WARNING: " + file_name + " contains empty audio holder. (score_parser.py)")
                break
                
            if page.get('state') != "complete":
                print("WARNING: " + file_name + " contains incomplete page " +page_name+ ". (score_parser.py)")
                break;
            
            # Check if page in the store
            if storage.get(page_name) == None:
                storage[page_name] = {'header':[], 'axis':{}} # add to the store
            
            # strip repetitions
            page_name_root = re.sub('-repeat-.$', '', page_name)

            # Get the axis names
            pageConfig = root.find('./waet/page/[@id="'+page_name_root+'"]')
            if pageConfig is None:
                interfaceName = "default"
                if storage[page_name]['axis'].get(interfaceName) == None:
                    storage[page_name]['axis'][interfaceName] = {}  # If not in store for page, add empty dict
                storage[page_name]['axis'][interfaceName][subject_id] = []
            else:
                for interface in pageConfig.findall('./interface'):    # Get the <interface> nodes
                    interfaceName = interface.get("name"); # Get the axis name
                    if interfaceName == None:
                        interfaceName = "default"   # If name not set, make name 'default'
                    if storage[page_name]['axis'].get(interfaceName) == None:
                        storage[page_name]['axis'][interfaceName] = {}  # If not in store for page, add empty dict
                    storage[page_name]['axis'][interfaceName][subject_id] = [] # Add the store for the session
                    
            # header: fragment IDs in 'alphabetical' order
            # go to fragment column, or create new column if it doesn't exist yet
            
            # get alphabetical array of fragment IDs from this subject's XML
            fragmentnamelist = []    # make empty list
            for audioelement in page.findall("./audioelement"): # iterate over all audioelements
                if audioelement is not None and audioelement.get('type') != "outside-reference":
                    fragmentnamelist.append(audioelement.get('ref')) # add to list
            
            fragmentnamelist = sorted(fragmentnamelist);    # Sort the list
            storage[page_name]['header'] = fragmentnamelist;
            
            for fragmentname in fragmentnamelist:
                audioElement = page.find("./audioelement/[@ref='"+ fragmentname+ "']") # Get the element
                for value in audioElement.findall('./value'):
                    axisName = value.get('interface-name')
                    if axisName == None or axisName == "null":
                        axisName = 'default'
                    axisStore = storage[page_name]['axis'][axisName]
                    if hasattr(value, 'text'):
                        axisStore[subject_id].append(value.text)
                    else:
                        axisStore[subject_id].append('')

# Now create the individual files
for page_name in storage:
    for axis_name in storage[page_name]['axis']:
        
        file_name = folder_name+'/ratings/'+page_name+'-'+axis_name+'-ratings.csv' # score file name
        
        # I'm not as elegant, I say burn the files and start again
        headerrow = list(storage[page_name]['header'])  # Extract the element IDs
        headerrow.insert(0,'file_keys')
        with open(file_name, 'w') as writefile:
            filewriter = csv.writer(writefile, delimiter=',')
            filewriter.writerow(headerrow)
        
        # open file to write the page
        writefile = open(file_name, 'a')
        filewriter = csv.writer(writefile, delimiter=',')
        
        for subject_id in storage[page_name]['axis'][axis_name]:
            entry = [subject_id]
            for value in storage[page_name]['axis'][axis_name][subject_id]:
                entry.append(value)
            filewriter.writerow(entry)
        writefile.close()
