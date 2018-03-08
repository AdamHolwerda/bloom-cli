#! /usr/bin/env node

const fs = require('fs'); // get fileSystem
const concatStream = require('concat-stream'); //put a streaming chunked file into one glob
const q = require('q'); //so we can defer
const inquirer = require('inquirer'); //so we can ask questions
const open = require('open'); //so we can open files
const htmlEncode = require('htmlencode').htmlEncode; //so we can make sure our links work
const vinylFs = require('vinyl-fs');
const striptags = require('striptags');
const vinylFtp = require('vinyl-ftp');
const jsonfile = require('jsonfile');
const removeMD = require('remove-markdown');
const entities = require('entities');
const ssmlVal = require('ssml-validator');
const bloomfile = './bloom.json';

global.headerString = '';
global.headerMarkup = '';
global.projectTitle = '';
global.projectSubtitle = '';
global.sequentialLinks = false;
global.showWords = false;
global.alphabetical = false;
global.ftp = false;
global.hostname = '';
global.username = '';
global.password = '';
global.remotePath = '';
global.googleAnalyticsID = '';
global.googleAnalyticsScript = '';
global.bloomFileSettings = {};
global.useBloomFile = false;

const userArgs = process.argv.slice(2);
let fileToBloomFrom = userArgs[0];

if (!fileToBloomFrom) {
    fileToBloomFrom = 'index.html'; //assume it's index.html if they didn't provide a file
}

const isThereABloomFile = fs.existsSync(bloomfile);

if (isThereABloomFile) {
    global.bloomFileSettings = jsonfile.readFile(bloomfile, (error, data) => {

        if (error) {
            console.log(error)
            ;
        }
        global.bloomFileSettings = data;
    });
}

const inputFile = fs.createReadStream(fileToBloomFrom);
const analyticsFileExists = fs.existsSync(__dirname + '/analytics.html');
const headerFileExists = fs.existsSync(__dirname + '/header.html');
let headerFile = '';
let analyticsFile = '';

if (headerFileExists) {
    headerFile = fs.createReadStream(__dirname + '/header.html');
}

if (analyticsFileExists) {
    analyticsFile = fs.createReadStream(__dirname + '/analytics.html');
}

const cssFileExists = fs.existsSync('css/style.css');
let cssFile;

if (cssFileExists) {
    cssFile = fs.createReadStream('css/style.css');
}

const indexStyles = '<style>ul{margin-left:0; padding-left:0; list-style-type:none;}ul li{margin-left:0; padding-left:0;} a {color:#444;} a:visited{color:black}</style>';
const coverImageExists = fs.existsSync('images/cover.jpg');

const outDirName = fileToBloomFrom.replace('.html', '') + '-bloomed';

const imageFolderExists = fs.existsSync('./' + outDirName + '/images');
let coverImage;     

const outDir = fs.existsSync('./' + outDirName);

function answersCallback(answers) {

    global.projectTitle = '<h1>' + answers.title + '</h1>';
    global.projectSubtitle = '<h3>' + answers.subtitle + '</h3>';

    global.headerMarkup = global.headerString.replace('<title></title>', '<title>' + answers.title + '</title>');

    if (answers.words) {
        global.showWords = true;
    }

    if (answers.alphabetical) {
        global.alphabetical = true;
    }

    if (answers.sequential) {
        global.sequentialLinks = true;
    }

    if (answers.googleAnalyticsID && answers.googleAnalyticsID !== '') {
        global.googleAnalyticsID = answers.googleAnalyticsID;
    }

    if (answers.ftp) {

        global.ftp = true;

        inquirer.prompt([{
            'name': 'hostname',
            'message': 'Enter your hostname (exclude ftp:// or www prefixes)'
        }, {
            'name': 'username',
            'message': 'Enter your username for that host'
        }, {
            'name': 'password',
            'type': 'password',
            'message': 'Enter your password for that host'
        }, {
            'name': 'remotePath',
            'message': 'Type a remote directory you\'d like to bloom into (ex: html/project)'
        }

        ], (moreAnswers) => {

            global.hostname = moreAnswers.hostname;
            global.username = moreAnswers.username;
            global.password = moreAnswers.password;
            global.remotePath = moreAnswers.remotePath;

            runProgram();

        });


    } else {

        runProgram();

    }

}


function askTheQuestions() {
  
    inquirer.prompt([{
        'name': 'title',
        'message': 'What\'s the title of your project?'
    }, {
        'name': 'subtitle',
        'message': 'Does your project have a subtitle?'
    }, {
        'type': 'confirm',
        'name': 'words',
        'default': false,
        'message': 'Show word counts next to index links?'
    }, {
        'type': 'confirm',
        'name': 'alphabetical',
        'default': false,
        'message': 'Alphebetize the links?'
    }, {
        'type': 'confirm',
        'name': 'sequential',
        'default': false,
        'message': 'Should your sheets link sequentially instead of back to index page?'
    }, {
        'name' : 'googleAnalyticsID',
        message : 'If you have a Google Analytics ID, Bloom will add a script on every page. Otherwise leave blank'
    }, {
        'type': 'confirm',
        'name': 'ftp',
        'default': false,
        'message': 'Bloom can upload your files for you, if you provide FTP details. Yeah?'
    }], (answers) => {

        answersCallback(answers);

    });

}


if (isThereABloomFile) {

    inquirer.prompt([{
        name: 'useBloomFile',
        message: 'Use the settings in this folder\'s bloomfile?',
        type: 'confirm',
        default: true
    }], (answer) => {

        global.useBloomFile = answer.useBloomFile;

        if (answer.useBloomFile) {

            answersCallback(global.bloomFileSettings);

        } else {
                
            askTheQuestions();

        }

    });

} else {

    askTheQuestions();

}

function makeFileAString(file) {

    const deferred = q.defer(); // make a new deferred object so we can chain some shit

    file.pipe(concatStream((data) => {

        deferred.resolve(data.toString()); //resolve the deferred object and make it fill with the data

    }));

    return deferred.promise; //output our data

}

 function numberWithCommas(x) {
    if (!x) {
        return '';
    }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}



// HERE IS WHERE OUR PROGRAM STARTS

if (!outDir) {

    fs.mkdir('./' + outDirName); //make a folder

}

const ssmlDir = fs.existsSync('./' + outDirName + '/ssml');

if (!ssmlDir) {

    fs.mkdir('./' + outDirName + '/ssml'); //make an ssml folder
}

if (headerFileExists) {

    makeFileAString(headerFile)
        .then((data) => {

            global.headerString = data;
        });

} else {
    console.log('There is no header file');
}

if (analyticsFileExists) {

    makeFileAString(analyticsFile)
        .then((data) => {
            global.googleAnalyticsScript = data;
        });

} 

if (cssFileExists) {
    makeFileAString(cssFile).then((data) => {

        fs.writeFile(outDirName + '/style.css', data, (err) => {
            if (err) {
                console.log('error', err);
            }
        });

    });
}

function runProgram() {

    makeFileAString(inputFile).then((data) => {

        const splitter = '<h1>'; // we could have this be a prompted answer

        const textArray = data.split(splitter);

        const includeInIndex = '';

        if (coverImageExists) {

            if (!imageFolderExists) {
                fs.mkdir('./' + outDirName + '/images');
            }
            
            fs.createReadStream('images/cover.jpg').pipe(fs.createWriteStream(outDirName + '/images/cover.jpg'));

            coverImage = '<img src = \'images/cover.jpg\' />';

        } else {
            coverImage = '';
        }

        const datetime = new Date();

        const commentDate = '<!-- Generated on ' + datetime + ' with bloom-cli -->';

        let indexStr = commentDate + '<ul>';

        const titleArray = [];
        const webTitleArray = [];

        for (let i = 0; i < textArray.length; i++) {

            const next = i + 1;
            const last = i - 1;

            let title = i > 0 ? textArray[i].split('</h1>')[0] : 'index';
            let hideThis = false;
            let nextTitle = next < textArray.length ? textArray[next].split('</h1>')[0] : 'index';
            let lastTitle = last > 0 ? textArray[last].split('</h1>')[0] : '';


            if (title.indexOf('%') > -1) {
                hideThis = true;
            }

            title = striptags(title); //strip tags
            lastTitle = striptags(lastTitle);
            nextTitle = striptags(nextTitle);

            let webTitle = title.toLowerCase().replace(new RegExp(' ', 'g'), '-');

            webTitle = webTitle.replace(new RegExp('#', 'g'), '');
            webTitle = webTitle.replace(new RegExp('\\.', 'g'), '-');
         
            let lastWebTitle = lastTitle.toLowerCase().replace(new RegExp(' ', 'g'), '-');

            lastWebTitle = lastWebTitle.replace(new RegExp('#', 'g'), '');
            lastWebTitle = lastWebTitle.replace(new RegExp('\\.', 'g'), '-');
          
            let nextWebTitle = nextTitle.toLowerCase().replace(new RegExp(' ', 'g'), '-');

            nextWebTitle = nextWebTitle.replace(new RegExp('#', 'g'), '');
            nextWebTitle = nextWebTitle.replace(new RegExp('\\.', 'g'), '-');
          
            if (title !== 'index' && title !== '') {

                indexStr = hideThis ? indexStr : indexStr + '<li><a href = \'' + webTitle + '.html\'>' + title + '</a></li>';

            }

            const backButtonMarkup = global.sequentialLinks ? '<a class = \'button-back\' href = \'' + lastWebTitle + '.html\'>previous</a>' : '<a class = \'button-back\' href = \'index.html\'>back</a>';
            const nextButtonMarkup = global.sequentialLinks ? '<br><br><a class = \'button-next\' href = \'' + nextWebTitle + '.html\'>next</a>' : '<br><br><a class = \'button-next\' href = \'index.html\'>back</a>';

            const backButton = title === 'index' || lastWebTitle.indexOf('%') > -1 ? '' : backButtonMarkup;
            const nextButton = title === 'index' || nextWebTitle.indexOf('%') > -1 ? '' : nextButtonMarkup;

            const analytics = global.googleAnalyticsID !== '' ? global.googleAnalyticsScript.replace('bloom-googleAnalyticsID', global.googleAnalyticsID) : '';

            const finalText = textArray[i];

            const fileContents = backButton + splitter + finalText + nextButton + analytics + '</body></html>';

            const wordCount = finalText.split(' ').length;

            //spit out the file in this next part

            if (title !== 'index' && !hideThis) {

                const thisHeader = global.headerString.replace('<title></title>', '<title>' + title + '</title>');

                fs.writeFile(outDirName + '/' + webTitle + '.html', thisHeader + fileContents, (err) => { // this is htmlencoding automatically so we don't do it here

                    if (err) {

                        console.log('error2', err);
                    }

                });


                //throw stripped versions in txt folder

                let file = entities.decodeHTML(removeMD(splitter + finalText));

                const prepend = '<speak>';
                const append = '</speak>';

                const authorOrNot = global.bloomFileSettings.author ? '<break time = "1s" /> by ' + global.bloomFileSettings.author + '<break time = "3s" />' : '<break time = "3s" />';

                file = file.replace(/\n\n/ , authorOrNot);
                file = file.replace(/\n\n/g , '<break time = "1s" />');
                file = file.replace(/--/g , '<break time = "800ms" />');
                file = file.replace(/ - /g , '<break time = "800ms" />');
                file = file.replace(/\n/g , '');

                file = prepend + file + append;

                file = ssmlVal.correct(file);

                fs.writeFile(outDirName + '/ssml/' + webTitle + '.xml', file, (err) => { 

                    if (err) {

                        console.log('error2', err);
                    }

                });


            }  //after making file, gather stuff for index file

            if (global.showWords && title !== '' && title !== 'index') {

                title = title + ' (' + numberWithCommas(wordCount) + ' words)';

                indexStr = indexStr.replace(new RegExp(title), title + ' (' + wordCount + ' words)');

            }

            if (title !== '' && title !== 'index') {

                titleArray.push(title);
                webTitleArray.push(webTitle);

            }

        }

        if (global.alphabetical) {
            titleArray.sort((a, b) => {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            webTitleArray.sort();
        }

        indexStr = commentDate + '<ul>'; //start over with this string
        let j = -1;

        titleArray.map((one) => {
            j++;

            if (one.indexOf('%') > -1) {
                return '';
            }

            if (one === 'index') {
                return '';
            }

            const nonWebTitle = one.split(' (');
            let webTitleTwo = webTitleArray[j];

            webTitleTwo = webTitleTwo.split('-(');

            if (nonWebTitle.length > 1) {
                indexStr += '<li><a href = \'' + webTitleTwo + '.html\'>' + nonWebTitle[0] + '</a> (' + nonWebTitle[1] + '</li>';
            } else {
                indexStr += '<li><a href = \'' + webTitleTwo + '.html\'>' + nonWebTitle[0] + '</a></li>';
            }

        });

        const analytics = global.googleAnalyticsID !== '' ? global.googleAnalyticsScript.replace('bloom-googleAnalyticsID', global.googleAnalyticsID) : '';

        fs.writeFile(outDirName + '/index.html', (global.headerMarkup + indexStyles + coverImage + global.projectTitle + global.projectSubtitle + includeInIndex + indexStr + '</ul>' + analytics + '</body></html>'), (err) => {

            if (err) {

                console.log('error3', err);
            }

            //launch the static site in the user's browser

            if (global.ftp) {

                const conn = new vinylFtp({
                    host: global.hostname,
                    user: global.username,
                    password: global.password,
                    parallel: 10,
                    log: function (item) {
                        console.log(item);
                    }
                });

                vinylFs.src([outDirName + '/**'], {
                    buffer: false
                })
                    .pipe(conn.dest(global.remotePath));

            }

            open(outDirName + '/index.html');
        });

    });

}
