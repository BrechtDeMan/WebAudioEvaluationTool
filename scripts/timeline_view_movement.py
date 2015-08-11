#!/usr/bin/python

import xml.etree.ElementTree as ET
import os # list files in directory
import sys # command line arguments
import matplotlib.pyplot as plt # plots
import matplotlib.patches as patches # rectangles


# COMMAND LINE ARGUMENTS

assert len(sys.argv)<3, "timeline_view_movement takes at most 1 command line argument\n"+\
                        "Use: python timeline_view_movement.py [XML_files_location]"

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves"    # Looks in 'saves/' folder from 'scripts/' folder
    print "Use: python timeline_view_movement.py [XML_files_location]"
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
timeline_folder = folder_name + '/timelines_movement/'    # Stores in 'saves/timelines_movement/' by default

# Font settings
font = {'weight' : 'bold',
        'size'   : 16}
plt.rc('font', **font)

# Colormap for to cycle through
colormap = ['b', 'g', 'c', 'm', 'y', 'k']

# figure size
fig_width = 25
fig_height = 10


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
        
        previous_audioholder_time = 0 # time spent before current audioholder
        time_offset = 0 # test starts at zero
        
        # ONE TIMELINE PER PAGE - make new plot per page

        # get list of all page names
        for audioholder in root.findall("./audioholder"):   # iterate over pages
            page_name = audioholder.get('id')               # get page name
            
            if page_name is None: # ignore 'empty' audio_holders
                print "Skipping empty audioholder name from "+subject_id+"."
                break
                
            # subtract total audioholder length from subsequent audioholder event times
            audioholder_time_temp = audioholder.find("./metric/metricresult/[@id='testTime']")
            if audioholder_time_temp is not None: 
                audioholder_time = float(audioholder_time_temp.text)
            else: 
                print "Skipping audioholder without total time specified from "+subject_id+"."
                break

            # get audioelements
            audioelements = audioholder.findall("./audioelement")
            
            # sort alphabetically
            data = []
            for elem in audioelements: # from http://effbot.org/zone/element-sort.htm
                key = elem.get("id")
                data.append((key, elem))
            data.sort()
            
            N_audioelements = len(audioelements) # number of audio elements for this page
            increment = 0 # increased for every new audioelement
            
            # get axes handle
            fig = plt.figure(figsize=(fig_width, fig_height))
            ax  = fig.add_subplot(111)
            
            # for page [page_name], print comments related to fragment [id]
            #for tuple in data:
            #    audioelement = tuple[1]
            for tuple in data:
                audioelement = tuple[1]
                if audioelement is not None: # Check it exists
                    audio_id = str(audioelement.get('id'))
                    
                    # break if no initial position or move events registered
                    initial_position_temp = audioelement.find("./metric/metricresult/[@name='elementInitialPosition']")
                    if initial_position_temp is None:
                        print "Skipping "+page_name+" from "+subject_id+": does not have initial positions specified."
                        break
                    
                    # for this audioelement, loop over all move events
                    initial_position = float(initial_position_temp.text)
                    move_events = audioelement.findall("./metric/metricresult/[@name='elementTrackerFull']/timepos")
                    final_position = float(audioelement.find("./value").text)
                    
                    # display fragment name at start
                    plt.text(0,initial_position+0.02,audio_id,color=colormap[increment%len(colormap)]) #,rotation=45
                    
                    # previous position and time
                    previous_position = initial_position
                    previous_time = 0
                    
                    # draw all segments except final one
                    for event in move_events: 
                        new_time = float(event.find("./time").text)-time_offset
                        new_position = float(event.find("./position").text)
                        # horizontal line from previous to current time
                        plt.plot([previous_time, new_time], # x-values
                            [previous_position, previous_position], # y-values
                            color=colormap[increment%len(colormap)],
                            linewidth=3
                        )
                        # vertical line from previous to current position
                        plt.plot([new_time, new_time], # x-values
                            [previous_position, new_position], # y-values
                            color=colormap[increment%len(colormap)],
                            linewidth=3
                        )
                        
                        # update previous_position value
                        previous_position = new_position
                        previous_time     = new_time
                    
                    # draw final segment
                    # horizontal line from previous time to end of audioholder
                    plt.plot([previous_time, audioholder_time-time_offset], # x-values
                        [previous_position, previous_position], # y-values
                        color=colormap[increment%len(colormap)],
                        linewidth=3
                    )
                    
                    # display fragment name at end
                    plt.text(audioholder_time-time_offset,previous_position,\
                             audio_id,color=colormap[increment%len(colormap)]) #,rotation=45
                    
                    # for this audioelement, loop over all listen events
#                     listen_events = audioelement.findall("./metric/metricresult/[@name='elementListenTracker']/event")
#                     for event in listen_events:
#                         # get testtime: start and stop
#                         start_time = float(event.find('testtime').get('start'))
#                         stop_time  = float(event.find('testtime').get('stop'))
                        
                        
                increment+=1 # to next audioelement
            
            last_audioholder_duration = audioholder_time-time_offset
            time_offset = audioholder_time
            

            # set plot parameters
            plt.title('Timeline ' + file + ": "+page_name)
            plt.xlabel('Time [seconds]')
            plt.xlim(0, last_audioholder_duration)
            plt.ylabel('Rating') # default
            plt.ylim(0, 1) # rating between 0 and 1
            
            #y-ticks: labels on rating axis
            label_positions = []
            label_text = []
            scale_tags = root.findall("./BrowserEvalProjectDocument/audioHolder/interface/scale")
            scale_title = root.find("./BrowserEvalProjectDocument/audioHolder/interface/title")
            for tag in scale_tags:
                label_positions.append(float(tag.get('position'))/100) # on a scale from 0 to 100
                label_text.append(tag.text)
            if len(label_positions) > 0:
                plt.yticks(label_positions, label_text) # show rating axis labels
            # set label Y-axis
            if scale_title is not None: 
                plt.ylabel(scale_title.text)
            
            #plt.show() # uncomment to show plot; comment when just saving
            #exit()
            
            plt.savefig(timeline_folder+subject_id+"-"+page_name+".pdf", bbox_inches='tight')
            plt.close()
            