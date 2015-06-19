#!/usr/bin/python

import xml.etree.ElementTree as ET
import os
import csv

# get every XML file in folder
for file in os.listdir("."): # You have to put this script in folder where output XML files are.
    if file.endswith(".xml"):
        tree = ET.parse(file)
        root = tree.getroot()

        # get list of all page names
        for audioholder in root.findall("./audioholder"):   # iterate over pages
            page_name = audioholder.get('id')               # get page name
            
            if page_name is None: # ignore 'empty' audio_holders
                break

            # create folder [page_name] if not yet created
            if not os.path.exists(page_name):
                os.makedirs(page_name)

            # for page [page_name], print comments related to fragment [id]
            for audioelement in root.findall("*/[@id='"+page_name+"']/audioelement"):
                if audioelement is not None: # Check it exists
                    audio_id = str(audioelement.get('id'))
                    
                    
                    csv_name = page_name+'/'+page_name+'-comments-'+audio_id+'.csv'

                    # append (!) to file [page_name]/[page_name]-comments-[id].csv
                    with open(csv_name, 'a') as csvfile:
                        writer = csv.writer(csvfile, 
                                            delimiter=',', 
                                            dialect="excel",
                                            quoting=csv.QUOTE_ALL)
                        commentstr = root.find("*/[@id='"
                                               + page_name
                                               + "']/audioelement/[@id='"
                                               + audio_id
                                               + "']/comment/response").text
                        if commentstr is None:
                            writer.writerow([''])
                        else:
                        	# anonymous comments:
                            writer.writerow([commentstr]) 
                            # comments with (file) name:
                            #writer.writerow([file[:-4]] + [commentstr]) 

                        #TODO Replace 'new line' in comment with something else?
                        
# PRO TIP: Change from csv to txt by running this in bash: 
# $ cd folder_where_csvs_are/
# $ for i in *.csv; do mv "$i" "${i/.csv}".txt; done
