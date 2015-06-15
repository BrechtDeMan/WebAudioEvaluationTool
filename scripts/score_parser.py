import xml.etree.ElementTree as ET
import os
import csv

#TODO Remove DEBUG statements

# get every XML file in folder
for file in os.listdir("."): # You have to put this in folder where output XML files are.
    if file.endswith(".xml"):
        tree = ET.parse(file)
        root = tree.getroot()
        #print ["DEBUG Reading " + file + "..."]

        # get subject ID from XML file
        subject_id = file # file name as subject ID

        # get list of all pages this subject evaluated
        for audioholder in root.findall("./audioholder"):    # iterate over pages
            page_name = audioholder.get('id') # get page name
            #print ["DEBUG    page " + page_name]
            
            if page_name is None: # ignore 'empty' audio_holders
                break

            file_name = 'ratings/'+page_name+'-ratings.csv' # score file name

            # create folder 'ratings if not yet created
            if not os.path.exists('ratings'):
                os.makedirs('ratings')

            # header: fragment IDs in 'alphabetical' order
            # go to fragment column, or create new column if it doesn't exist yet

            # get array of audio elements and number of audio elements
            audiolist = root.findall("*/[@id='"+page_name+"']/audioelement")
            n_fragments = len(audiolist)

            # get alphabetical array of fragment IDs from this subject's XML
            fragmentnamelist = []    # make empty list
            for audioelement in audiolist: # iterate over all audioelements
                fragmentnamelist.append(audioelement.get('id')) # add to list


            # if file exists, get header and add 'new' fragments
            if os.path.isfile(file_name):
                #print ["DEBUG file " + file_name + " already exists - reading header"]
                with open(file_name, 'r') as readfile:
                    filereader = csv.reader(readfile, delimiter=',')
                    headerrow = filereader.next()
                    #headerrow = headerrow[1:] # remove first column (empty)

                    # Which of the fragmentes are in fragmentnamelist but not in headerrow?
                    newfragments = list(set(fragmentnamelist)-set(headerrow))
                    newfragments = sorted(newfragments) # new fragments in alphabetical order
                    # If not empty, read file and rewrite adding extra columns
                    if newfragments: # if not empty
                        print ["DEBUG New fragments found: " + str(newfragments)]
                        with open('temp.csv', 'w') as writefile:
                            filewriter = csv.writer(writefile, delimiter=',')
                            filewriter.writerow(headerrow + newfragments) # write new header
                            for row in filereader: # rewrite row plus empty cells for every new fragment name
                                #print ["DEBUG Old row: " + str(row)]
                                filewriter.writerow(row + ['']*len(newfragments))
                                #print ["DEBUG New row: " + str(row + ['']*len(newfragments))]
                        os.rename('temp.csv', file_name) # replace old file with temp file
                        headerrow = headerrow + newfragments
                        print ["DEBUG New header row: " + str(headerrow)]

            # if not, create file and make header
            else:
                #print ["DEBUG file " + file_name + " doesn't exist yet - making new one"]
                headerrow = sorted(fragmentnamelist) # sort alphabetically
                headerrow.insert(0,'')
                fragmentnamelist = fragmentnamelist[1:] #HACKY FIX inserting in firstrow also affects fragmentnamelist
                with open(file_name, 'w') as writefile:
                    filewriter = csv.writer(writefile, delimiter=',')
                    filewriter.writerow(headerrow)

            # open file to write for this page
            writefile = open(file_name, 'a')
            filewriter = csv.writer(writefile, delimiter=',')

            # prepare row to be written for this subject for this page
            ratingrow = [subject_id]

            # get scores related to fragment [id]
            for fragmentname in headerrow[1:]: # iterate over fragments in header (skip first empty column)
                elementvalue = root.find("*/[@id='"
                                       + page_name
                                       + "']/audioelement/[@id='"
                                       + fragmentname
                                       + "']/value")
                if hasattr(elementvalue, 'text'): # if rating for this fragment exists
                    ratingrow.append(elementvalue.text) # add to rating row
                else: # if this subject has not rated this fragment
                    ratingrow.append('') # append empty cell

            # write row: [subject ID, rating fragment ID 1, ..., rating fragment ID M]
            filewriter.writerow(ratingrow)

