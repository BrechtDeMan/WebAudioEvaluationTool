# Web Audio Evaluation Tool

## Authors

| Author  | e-mail | 
| ------- | ------ |
| Nicholas Jillings 				| <[nicholas.jillings@mail.bcu.ac.uk](mailto:nicholas.jillings@mail.bcu.ac.uk)> |
| Brecht De Man					| <[mail@brechtdeman.com](mailto:mail@brechtdeman.com)> | 
| David Moffat					| <[d.j.moffat@qmul.ac.uk](mailto:d.j.moffat@qmul.ac.uk)>| 
| Joshua D. Reiss (supervisor)	| <[joshua.reiss@qmul.ac.uk](mailto:joshua.reiss@qmul.ac.uk)> | 
| Ryan Stables (supervisor)		| <[ryan.stables@bcu.ac.uk](mailto:ryan.stables@bcu.ac.uk)> | 


## Instructions

Please refer to the [Wiki](https://github.com/BrechtDeMan/WebAudioEvaluationTool/wiki). 

### Preview
The video below shows you can set up a simple test from scratch in under five minutes (click to open): 
[![Web Audio Evaluation Tool test setup](https://img.youtube.com/vi/T_rwE6Gt9sI/0.jpg)](https://www.youtube.com/watch?v=T_rwE6Gt9sI)

## Dependencies and compatibility

Runs out of the box on any web server with PHP (tested on PHP 5.1<=), no third party software needed. 

Alternatively, a local server (no web server or internet connection needed!) and optional Python analysis scripts run on Python 2.7 or 3.x. 
Plots rendered using [matplotlib](http://matplotlib.org), [NumPy](http://matplotlib.org) and [SciPy](http://scipy.org). 

As Microsoft Internet Explorer [does not support the Web Audio API](http://caniuse.com/#feat=audio-api), you will need another browser like Firefox, Chrome, Edge or Safari.

## Citing

When using the Web Audio Evaluation Tool, please acknowledge the authors and cite 

> Nicholas Jillings, Brecht De Man, David Moffat and Joshua D. Reiss, "[Web Audio Evaluation Tool: A Browser-Based Listening Test Environment](http://smcnetwork.org/system/files/SMC2015_submission_88.pdf)," [12th Sound and Music Computing Conference](http://www.maynoothuniversity.ie/smc15/), July 2015.

BibTeX: 

    @conference{waet2015,
    	Author = {Jillings, Nicholas and Moffat, David and De Man, Brecht and Reiss, Joshua D.},
	    Booktitle = {12th Sound and Music Computing Conference},
	    Month = {July},
	    Title = {Web {A}udio {E}valuation {T}ool: {A} browser-based listening test environment},
    	Year = {2015}}

## License

Please refer to LICENSE.txt ([GNU General Public License](http://www.gnu.org/licenses/gpl-3.0.en.html)).

If you wish to use elements of the Web Audio Evaluation Tool as part of a commercial product, please contact us for a commercial license. 
