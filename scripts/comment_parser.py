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

            # create folder [page_name] if not yet created
            if not os.path.exists(page_name):
                os.makedirs(page_name)

            # for page [page_name], print comments related to fragment [id]
            for audioelement in root.findall("*/[@id='"+page_name+"']/audioelement"):
                audio_id = str(audioelement.get('id'))
                # append to file [page_name]/[page_name]-comments-[id].csv
                with open(page_name+'/'+page_name+'-comments-'+audio_id+'.csv', 'a') as csvfile:
                    commentstr = root.find("*/[@id='"
                                           + page_name
                                           + "']/audioelement/[@id='"
                                           + audio_id
                                           + "']/comment/response").text
                    writer = csv.writer(csvfile, delimiter=',')
                    writer.writerow([commentstr.encode("utf-8")])
                    #TODO Comma doesn't act as delimiter now!
                    # (when adding more than just a comment per line):
                    # writer.writerow([file + ',' + commentstr.encode("utf-8")])

                    #TODO Replace 'new line' with something else?

                    #TODO 'Append' means duplicate entries if run several times...

