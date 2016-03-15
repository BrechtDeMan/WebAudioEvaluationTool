#!/usr/bin/python

import xml.etree.ElementTree as ET
import os
import sys
import csv

# COMMAND LINE ARGUMENTS

assert len(sys.argv)<3, "score_parser takes at most 1 command line argument\n"+\
                        "Use: python score_parser.py [rating_folder_location]"

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves"    # Looks in 'saves/' folder from 'scripts/' folder
    print "Use: python score_parser.py [rating_folder_location]"
    print "Using default path: " + folder_name
elif len(sys.argv) == 2:
    folder_name = sys.argv[1]   # First command line argument is folder

# check if folder_name exists
if not os.path.exists(folder_name):
    #the file is not there
    print "Folder '"+folder_name+"' does not exist."
    sys.exit() # terminate script execution
elif not os.access(os.path.dirname(folder_name), os.W_OK):
    #the file does exist but write privileges are not given
    print "No write privileges in folder '"+folder_name+"'."

    
# CODE

# remember which files have been opened this time
file_history = []

# get every XML file in folder
for file_name in os.listdir(folder_name):
    if file_name.endswith(".xml"):
        tree = ET.parse(folder_name + '/' + file_name)
        root = tree.getroot()

        # get subject ID from XML file
        subject_id = file_name[:-4] # file name (without extension) as subject ID

        # get list of all pages this subject evaluated
        for page in root.findall("./page"):    # iterate over pages
            page_name = page.get('ref') # get page reference ID
                       
            if page_name is None: # ignore 'empty' audio_holders
                print "WARNING: " + file_name + " contains empty audio holder. (score_parser.py)"
                break
                
            if page.get('state') != "complete":
                print "WARNING:" + file_name + " contains incomplete page " +page_name+ ". (score_parser.py)"
                break;

            file_name = folder_name+'/ratings/'+page_name+'-ratings.csv' # score file name

            # create folder 'ratings' if not yet created
            if not os.path.exists(folder_name + '/ratings'):
                os.makedirs(folder_name + '/ratings')

            # header: fragment IDs in 'alphabetical' order
            # go to fragment column, or create new column if it doesn't exist yet

            # get array of audio elements and number of audio elements
            audiolist = page.findall("./audioelement")
            n_fragments = len(audiolist)

            # get alphabetical array of fragment IDs from this subject's XML
            fragmentnamelist = []    # make empty list
            for audioelement in audiolist: # iterate over all audioelements
                fragmentnamelist.append(audioelement.get('ref')) # add to list


            # if file exists, get header and add any 'new' fragments not yet in the header
            if os.path.isfile(file_name):
                with open(file_name, 'r') as readfile:
                    filereader = csv.reader(readfile, delimiter=',')
                    headerrow = filereader.next()

                # If file hasn't been opened yet this time, remove all rows except header
                if file_name not in file_history:
                    with open(file_name, 'w') as writefile:
                        filewriter = csv.writer(writefile, delimiter=',')
                        headerrow = sorted(headerrow)
                        filewriter.writerow(headerrow)
                    file_history.append(file_name)

                # Which of the fragments are in fragmentnamelist but not in headerrow?
                newfragments = list(set(fragmentnamelist)-set(headerrow))
                newfragments = sorted(newfragments) # new fragments in alphabetical order
                # If not empty, read file and rewrite adding extra columns
                if newfragments: # if not empty
                    with open('temp.csv', 'w') as writefile:
                        filewriter = csv.writer(writefile, delimiter=',')
                        filewriter.writerow(headerrow + newfragments) # write new header
                        with open(file_name, 'r') as readfile:
                            filereader = csv.reader(readfile, delimiter=',')
                            filereader.next() # skip header
                            for row in filereader: # rewrite row plus empty cells for every new fragment name
                                filewriter.writerow(row + ['']*len(newfragments))
                    os.rename('temp.csv', file_name) # replace old file with temp file
                    headerrow = headerrow + newfragments
                    

            # if file does not exist yet, create file and make header
            else:
                headerrow = sorted(fragmentnamelist) # sort alphabetically
                headerrow.insert(0,'')
                fragmentnamelist = fragmentnamelist[1:] #HACKY FIX inserting in firstrow also affects fragmentnamelist
                with open(file_name, 'w') as writefile:
                    filewriter = csv.writer(writefile, delimiter=',')
                    filewriter.writerow(headerrow)
                file_history.append(file_name)

            # open file to write for this page
            writefile = open(file_name, 'a')
            filewriter = csv.writer(writefile, delimiter=',')

            # prepare row to be written for this subject for this page
            ratingrow = [subject_id]

            # get scores related to fragment [id]
            for fragmentname in headerrow[1:]: # iterate over fragments in header (skip first empty column)
                elementvalue = page.find("./audioelement/[@ref='"
                                       + fragmentname
                                       + "']/value")
                if hasattr(elementvalue, 'text'): # if rating for this fragment exists
                    ratingrow.append(elementvalue.text) # add to rating row
                else: # if this subject has not rated this fragment
                    ratingrow.append('') # append empty cell

            # write row: [subject ID, rating fragment ID 1, ..., rating fragment ID M]
            if any(ratingrow[1:]): # append to file if row non-empty (except subject name)
                filewriter.writerow(ratingrow)
