#!/usr/bin/python

import xml.etree.ElementTree as ET
import os # list files in directory
import sys # command line arguments
import matplotlib.pyplot as plt # plots

# COMMAND LINE ARGUMENTS

assert len(sys.argv)<3, "timeline_view takes at most 1 command line argument\n"+\
                        "Use: python timeline_view.py [timeline_folder_location]"

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves"    # Looks in 'saves/' folder from 'scripts/' folder
    print "Use: python timeline_view.py [timeline_folder_location]"
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


# CONFIGURATION 

# Folder where to store timelines
timeline_folder = folder_name + '/timelines/'    # Stores in 'saves/timelines/'

# Font settings
font = {'weight' : 'bold',
        'size'   : 16}
plt.rc('font', **font)

# Colormap for to cycle through
colormap = ['b', 'r', 'g', 'c', 'm', 'y', 'k']

# x-axis shows time per audioholder, not total test time
show_audioholder_time = True


# CODE

# create timeline_folder if not yet created
if not os.path.exists(timeline_folder):
    os.makedirs(timeline_folder)

# get every XML file in folder
for file in os.listdir(folder_name):
    if file.endswith(".xml"):
        tree = ET.parse(folder_name + '/' + file)
        root = tree.getroot()
        subject_id = file[:-4] # drop '.xml'
        
        time_offset = 0 # test starts at zero
        
        # ONE TIMELINE PER PAGE - make new plot per page

        # get list of all page names
        for audioholder in root.findall("./audioholder"):   # iterate over pages
            page_name = audioholder.get('id')               # get page name
            
            if page_name is None: # ignore 'empty' audio_holders
                break

            # SORT AUDIO ELEMENTS ALPHABETICALLY
            audioelements = audioholder.findall("./audioelement")
            
            data = []
            for elem in audioelements: # from http://effbot.org/zone/element-sort.htm
                key = elem.get("id")
                data.append((key, elem))
            data.sort()
            
            N_audioelements = len(audioelements) # number of audio elements for this page
            increment = 0 # increased for every new audioelement
            audioelements_names = [] # store names of audioelements
            
            # for page [page_name], print comments related to fragment [id]
            for tuple in data:
            	audioelement = tuple[1]
                if audioelement is not None: # Check it exists
                    audio_id = str(audioelement.get('id'))
                    audioelements_names.append(audio_id)
                    
                    # for this audioelement, loop over all listen events
                    listen_events = audioelement.findall("./metric/metricresult/[@name='elementListenTracker']/event")
                    for event in listen_events:
                        # get testtime: start and stop
                        start_time = float(event.find('testtime').get('start'))
                        stop_time  = float(event.find('testtime').get('stop'))
                        # event lines:
                        plt.plot([start_time-time_offset, start_time-time_offset], # x-values
                            [0, N_audioelements+1], # y-values
                            color='k'
                            )
                        plt.plot([stop_time-time_offset, stop_time-time_offset], # x-values
                            [0, N_audioelements+1], # y-values
                            color='k'
                            )
                        # plot time: 
                        plt.plot([start_time-time_offset, stop_time-time_offset], # x-values
                            [N_audioelements-increment, N_audioelements-increment], # y-values
                            color=colormap[increment%len(colormap)],
                            linewidth=6
                            )
                        
                increment+=1
                
            # subtract total audioholder length from subsequent audioholder event times
            audioholder_time = audioholder.find("./metric/metricresult/[@id='testTime']")
            if audioholder_time is not None and show_audioholder_time: 
                time_offset = float(audioholder_time.text)
                                           
            #TODO: if 'nonsensical' or unknown: dashed line until next event
            #TODO: Vertical lines for fragment looping point
            
            plt.title('Timeline ' + file) #TODO add song too
            plt.xlabel('Time [seconds]')
            plt.ylabel('Fragment')
            plt.ylim(0, N_audioelements+1)
            
            #y-ticks: fragment IDs, top to bottom
            plt.yticks(range(N_audioelements, 0, -1), audioelements_names) # show fragment names


            #plt.show() # uncomment to show plot; comment when just saving
            #exit()
            
            plt.savefig(timeline_folder+subject_id+"-"+page_name+".png")
            plt.close()