#!/usr/bin/python

import sys
import os
import csv
import matplotlib.pyplot as plt
import numpy as np
import scipy as sp
import scipy.stats

# COMMAND LINE ARGUMENTS

#TODO: Merge, implement this functionality
#TODO: Control by CLI arguments (plot types, save and/or show, ...) 

assert len(sys.argv)<4, "score_plot takes at most 2 command line arguments\n"+\
                        "Use: python score_plot.py [ratings_folder_location]."+\
                        "Type 'python score_plot.py -h' for more options"

# initialise plot types (false by default) and options
enable_boxplot    = False     # show box plot
enable_confidence = False     # show confidence interval
enable_combined   = False     # show combined plots
confidence        = 0.90      # confidence value (for confidence interval plot)
enable_individual = False     # show all individual ratings
show_individual   = []        # show specific individuals (empty: show all individuals found)
show_legend       = False     # show names of individuals

# DEFAULT: Looks in 'saves/ratings/' folder from 'scripts/' folder
rating_folder = "../saves/ratings/" 

# XML results files location
if len(sys.argv) == 1: # no extra arguments
    enable_boxplot    = True # show box plot
    print("Use: python score_plot.py [rating folder] [plot_type] [-l/-legend]")
    print("Type 'python score_plot.py -h' for help.")
    print("Using default path: " + rating_folder + " with boxplot.")
else:
    for arg in sys.argv: # go over all arguments
        if arg == '-h':
            # show help
            #TODO: replace with contents of helpfile score_plot.info (or similar)
            print("Use: python score_plot.py [rating_folder] [plot_type] [-l] [confidence]")
            print("   rating_folder:")
            print("            folder where output of 'score_parser' can be found, and")
            print("            where plots will be stored.")
            print("            By default, '../saves/ratings/' is used.")
            print("")
            print("PLOT TYPES")
            print(" Can be used in combination.")
            print("    box | boxplot | -b")
            print("            Enables the boxplot" )
            print("    conf | confidence | -c")
            print("            Enables the confidence interval plot" )
            print("    ind | individual | -i")
            print("            Enables plot of individual ratings" )
            print("")
            print("PLOT OPTIONS")
            print("    leg | legend | -l")
            print("            For individual plot: show legend with individual file names")
            print("    numeric value between 0 and 1, e.g. 0.95")
            print("            For confidence interval plot: confidence value")
            assert False, ""# stop immediately after showing help #TODO cleaner way
            
        # PLOT TYPES
        elif arg == 'box' or arg == 'boxplot' or arg == '-b':
            enable_boxplot    = True     # show box plot
        elif arg == 'conf' or arg == 'confidence' or arg == '-c':
            enable_confidence = True     # show confidence interval
            #TODO add confidence value input
        elif arg == 'ind' or arg == 'individual' or arg == '-i':
            enable_individual = True     # show all individual ratings
        elif arg == 'comb' or arg == 'combined' or arg == '-m':
            enable_combined   = True     # show combined plot with error bars  
        # PLOT OPTIONS
        elif arg == 'leg' or arg == 'legend' or arg == '-l':
            if not enable_individual: 
                print("WARNING: The 'legend' option is only relevant to plots of "+\
                      "individual ratings")
            show_legend = True     # show all individual ratings
        elif arg.isdigit():
            if not enable_confidence: 
                print("WARNING: The numeric confidence value is only relevant when "+\
                      "confidence plot is enabled")
            if float(arg)>0 and float(arg)<1:
                confidence = float(arg)
            else: 
                print("WARNING: The confidence value needs to be between 0 and 1")
        
        # FOLDER NAME
        else: 
             # assume it's the folder name
             rating_folder = arg

# at least one plot type should be selected: box plot by default
if not enable_boxplot and not enable_confidence and not enable_individual and not enable_combined:
    print("Default to enable boxplot")
    enable_boxplot = True

# check if folder_name exists
if not os.path.exists(rating_folder):
    #the file is not there
    print("Folder '"+rating_folder+"' does not exist.")
    sys.exit() # terminate script execution
elif not os.access(os.path.dirname(rating_folder), os.W_OK):
    #the file does exist but write rating_folder are not given
    print("No write privileges in folder '"+rating_folder+"'.")


# CONFIGURATION

# Font settings
font = {'weight' : 'bold',
        'size'   : 10}
plt.rc('font', **font)


# CODE
combined = {}

# get every csv file in folder
for file in os.listdir(rating_folder):
    if file.endswith(".csv"):
        page_name = file[:-4] # file name (without extension) is page ID

        # get header (as text)
        with open(rating_folder+file, 'rt') as readfile: # read this csv file
            filereader = csv.reader(readfile, delimiter=',')
            headerrow = next(filereader) # use headerrow as X-axis
            headerrow = headerrow[1:]

        # read ratings into matrix (as bytes)
        with open(rating_folder+file, 'rb') as readfile: # read this csv file
            filereader = csv.reader(readfile, delimiter=',')
            ratings = np.genfromtxt(readfile,
                                   delimiter=",",
                                   skip_header = 1,
                                   converters = {3: lambda s: float(s or 'Nan')},
                                   usecols=list(range(1,len(headerrow)+1))
                                   )
        
        # assert at least 2 subjects (move on to next file if violated)
        if ratings.shape[0]<2:
            print("WARNING: Just one subject for " + page_name + ". Moving on to next file.")
            break

        if len(ratings.shape) <= 1: # if only single subject
            ratings = [[r] for r in ratings] # turn into array of arrays

        # BOXPLOT
        if enable_boxplot:
            plt.boxplot(ratings)
            
        # CONFIDENCE INTERVAL
        if enable_confidence:
            iterator = 0
            for column in ratings.T: # iterate over transposed matrix
                # remove all 'Nan's from column
                column = column[~np.isnan(column)]
            
                # get number of non-Nan ratings (= #subjects)
                n = column.size
        
                # get mean
                mean_rating = np.mean(column)
        
                # get errors
                err = scipy.stats.sem(column)* sp.stats.t._ppf((1+confidence)/2., n-1)
        
                # draw plot
                plt.errorbar(iterator+1, 
                            mean_rating, 
                            yerr=err,
                            marker="x",
                            color ="k",
                            markersize=12,
                            linestyle='None')
                            
                iterator += 1 # increase counter
    
    
        # INDIVIDUAL PLOT
        if enable_individual or show_individual:
            # marker list and color map to cycle through
            markerlist = ["x", ".", "o", "*", "+", "v", ">", "<", "8", "s", "p"]
            colormap = ['b', 'r', 'g', 'c', 'm', 'y', 'k'] 
            increment = 0
            linehandles = []
            legendnames = []
            with open(rating_folder+file, 'r') as readfile: # read this csv file
                filereader = csv.reader(readfile, delimiter=',')
                headerrow = next(filereader) # use headerrow as X-axis
                headerrow = headerrow[1:]
                for row in filereader:
                    subject_id = row[0][:-4] # read from beginning of line
                    # assume plotting all individuals if no individual(s) specified
                    if not show_individual or subject_id in show_individual:
                        plothandle, = plt.plot(range(1,len(row)), # x-values
                                 ratings[increment,:],#row[1:], # y-values: csv values except subject name
                                 color=colormap[increment%len(colormap)],
                                 marker=markerlist[increment%len(markerlist)],
                                 markersize=10,
                                 linestyle='None',
                                 label=subject_id
                                )
                        linehandles.append(plothandle)
                        legendnames.append(subject_id)
                        if show_legend:
                            plt.legend(linehandles, legendnames,
                                       loc='upper right',
                                       bbox_to_anchor=(1.1, 1),
                                       borderaxespad=0.,
                                       numpoints=1 # remove extra marker
                                       )
                    increment += 1 # increase counter
        if enable_combined:
            print(page_name)
            combined[page_name] = {"labels": headerrow, "r": ratings}

        if enable_boxplot or enable_confidence or enable_individual:
            # TITLE, AXIS LABELS AND LIMITS
            plt.title(page_name)
            plt.xlabel('Fragment')
            plt.xlim(0, len(headerrow)+1) # only show relevant region, leave space left & right)
            plt.xticks(range(1, len(headerrow)+1), headerrow, rotation=90) # show fragment names
            plt.ylabel('Rating')
            plt.ylim(0,1)
            # SHOW PLOT
            #plt.show()
            #exit()
    
            # SAVE PLOT
            # automatically 
            plot_type = ("-box" if enable_boxplot else "") + \
                    ("-conf" if enable_confidence else "") + \
                    ("-ind" if enable_individual else "")
            plt.savefig(rating_folder+page_name+plot_type+".pdf", bbox_inches='tight')
            plt.close()

if enable_combined:
    plt.figure()
    pages = combined.keys()
    numcombined = len(pages)
    spacing = 1.0/float(numcombined+2)
    for i in range(0,numcombined):
        page_name = pages[i]
        N = len(combined[page_name]['labels'])
        mean = np.percentile(combined[page_name]['r'], 50, 0)
        p25 = np.percentile(combined[page_name]['r'], 25, 0)
        p75 = np.percentile(combined[page_name]['r'], 75, 0)
        yerr = [mean-p25, p75-mean]
        print(yerr)
        plt.errorbar(np.arange(0,N)+(spacing*(i+1)), combined[page_name]['r'].mean(0), yerr=yerr, fmt='x', elinewidth=0.5)
    ax = plt.gca()
    ax.grid(which='major', axis='x', linewidth=2, color='k')
    plt.show()
