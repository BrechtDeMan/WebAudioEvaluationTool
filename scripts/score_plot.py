#!/usr/bin/python

import sys
import os
import csv
import matplotlib.pyplot as plt
import numpy as np
import scipy as sp
import scipy.stats

# CONFIGURATION

# Which type(s) of plot do you want? 
enable_boxplot    = True      # show box plot
enable_confidence = False     # show confidence interval
confidence        = 0.90      # confidence value (for confidence interval plot)
enable_individual = False     # show all individual ratings
show_individual   = []        # show specific individuals
show_legend       = False     # show names of individuals
#TODO: Merge, implement this functionality
#TODO: Control by CLI arguments (plot types, save and/or show, ...) 

# Enter folder where rating CSV files are (generated with score_parser.py or same format).
rating_folder = '../saves/ratings/' # folder with rating csv files

# Font settings
font = {'weight' : 'bold',
        'size'   : 10}
plt.rc('font', **font)


# CODE

# get every csv file in folder
for file in os.listdir(rating_folder): # You have to put this in folder where rating csv files are.
    if file.endswith(".csv"):
        page_name = file[:-4] # file name (without extension) is page ID

        # get header
        with open(rating_folder+file, 'rb') as readfile: # read this csv file
            filereader = csv.reader(readfile, delimiter=',')
            headerrow = filereader.next() # use headerrow as X-axis
            headerrow = headerrow[1:]

        # read ratings into matrix
#         ratings = np.loadtxt(open(rating_folder+file,"rb"),
#                             delimiter=",",
#                             skiprows=1,
#                             usecols=range(1,len(headerrow)+1)
#                             )
            ratings = np.genfromtxt(readfile,
                                   delimiter=",",
                                   #skip_header = 1,
                                   converters = {3: lambda s: float(s or 'Nan')},
                                   usecols=range(1,len(headerrow)+1)
                                   )
        
        # assert at least 2 subjects (move on to next file if violated)
        if ratings.shape[0]<2:
            print "WARNING: Just one subject for " + page_name + ". Moving on to next file."
            break

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
            with open(rating_folder+file, 'rb') as readfile: # read this csv file
                filereader = csv.reader(readfile, delimiter=',')
                headerrow = filereader.next() # use headerrow as X-axis
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

        # TITLE, AXIS LABELS AND LIMITS
        plt.title(page_name)
        plt.xlabel('Fragment')
        plt.xlim(0, len(headerrow)+1) # only show relevant region, leave space left & right)
        plt.xticks(range(1, len(headerrow)+1), headerrow) # show fragment names
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
        plt.savefig(rating_folder+page_name+plot_type+".png")
        plt.close()
