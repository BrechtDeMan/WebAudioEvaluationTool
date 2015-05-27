import xml.etree.ElementTree as ET
import os
import csv

# Manually enter song names to extract data for (one or more).
song_names = ['live-DAW', 'live-LeadMe', 'studio-DAW', 'studio-InTheMeantime']

for song_name in song_names:    # iterate over songs
    # create folder [song_name] if not yet created
    if not os.path.exists(song_name):
        os.makedirs(song_name)

    # get every XML file in folder
    for file in os.listdir("."): # You have to put this in folder where output XML files are.
        if file.endswith(".xml"):
            tree = ET.parse(file)
            root = tree.getroot()

            # for song [song_name], print comments related to mix [id]
            for audioelement in root.findall("*/[@id='"+song_name+"']/audioelement"):
                audio_id = str(audioelement.get('id'))
                # append to file [song_name]/[song_name]-comments-[id].csv
                with open(song_name+'/'+song_name+'-comments-'+audio_id+'.csv', 'a') as csvfile:
                    commentstr = root.find("*/[@id='"
                                           + song_name
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