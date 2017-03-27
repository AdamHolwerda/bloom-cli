#! /usr/bin/env node

global.headerString = "";
global.projectTitle = "";
global.projectSubtitle = "";
global.sequentialLinks = false;
global.showWords = false;
global.alphabetical = false;
global.ftp = false
global.hostname = "";
global.username = "";
global.password = "";
global.remotePath = "";

var userArgs = process.argv.slice(2);
var fileToBloomFrom = userArgs[0];

if (!fileToBloomFrom) {
    fileToBloomFrom = 'index.html'; //assume it's index.html if they didn't provide a file
}

var fs = require('fs'); // get fileSystem
var concatStream = require('concat-stream'); //put a streaming chunked file into one glob
var q = require('q'); //so we can defer
var inquirer = require('inquirer'); //so we can ask questions
var open = require('open'); //so we can open files
var htmlEncode = require('htmlencode').htmlEncode //so we can make sure our links work
var vinylFs = require('vinyl-fs');
var vinylFtp = require('vinyl-ftp');

var inputFile = fs.createReadStream(fileToBloomFrom);
var headerFileExists = fs.existsSync(__dirname + '/header.html');
var headerFile = "";

if (headerFileExists) {
    headerFile = fs.createReadStream(__dirname + '/header.html');
}

var cssFileExists = fs.existsSync('css/style.css');
var cssFile;

if (cssFileExists) {
    cssFile = fs.createReadStream('css/style.css');
}

var indexStyles = "<style>ul{margin-left:0; padding-left:0; list-style-type:none;}ul li{margin-left:0; padding-left:0;} a {color:#444;} a:visited{color:black}</style>";

var coverImageExists = fs.existsSync('images/cover.jpg');
var coverImage;

var outDirName = fileToBloomFrom.replace('.html', '') + '-bloomed';
var outDir = fs.existsSync('./' + outDirName);

inquirer.prompt([{
    "name": "title",
    "message": "What's the title of your project?"
}, {
    "name": "subtitle",
    "message": "Give your project a subtitle?"
}, {
    "type": "confirm",
    "name": "words",
    "default": false,
    "message": "Show word counts next to index links?"
}, {
    "type": "confirm",
    "name": "alphabetical",
    "default": false,
    "message": "Alphebetize the links?"
}, {
    "type": "confirm",
    "name": "sequential",
    "default": false,
    "message": "Should your sheets link sequentially instead of back to index page?"
}, {
    "type": "confirm",
    "name": "ftp",
    "default": false,
    "message": "Bloom can upload your files for you, if you provide FTP details. Yeah?"
}], function(answers) {

    global.projectTitle = "<h1>" + answers.title + "</h1>";
    global.projectSubtitle = "<h3>" + answers.subtitle + "</h3>";

    global.headerString = global.headerString.replace('<title></title>', '<title>' + answers.title + '</title>');

    if (answers.words) {

        global.showWords = true;

    }

    if (answers.alphabetical) {

        global.alphabetical = true;

    }

    if (answers.sequential) {

        global.sequentialLinks = true;

    }

    if (answers.ftp) {

        global.ftp = true;

        inquirer.prompt([{
                "name": "hostname",
                "message": "Enter your hostname (exclude ftp:// or www prefixes)",
            }, {
                "name": "username",
                "message": "Enter your username for that host"
            }, {
                "name": "password",
                "type": "password",
                "message": "Enter your password for that host"
            }, {
                "name": "remotePath",
                "message": "Type a remote directory you'd like to bloom into (ex: html/project)"
            },

        ], function(moreAnswers) {

            global.hostname = moreAnswers.hostname;
            global.username = moreAnswers.username;
            global.password = moreAnswers.password;
            global.remotePath = moreAnswers.remotePath;

            runProgram();

        });


    } else {

        runProgram();

    }

});

function makeFileAString(file) {

    var deferred = q.defer(); // make a new deferred object so we can chain some shit

    file.pipe(concatStream(function(data) {

        deferred.resolve(data.toString()); //resolve the deferred object and make it fill with the data

    }));

    return deferred.promise; //output our data

}

// HERE IS WHERE OUR PROGRAM STARTS

if (!outDir) {

    fs.mkdir('./' + outDirName); //make a folder

}

if (headerFileExists) {

    makeFileAString(headerFile)
        .then(function(data) {

            global.headerString = data;
        });

} else {
    console.log('There is no header file');
}

if (cssFileExists) {
    makeFileAString(cssFile).then(function(data) {

        fs.writeFile(outDirName + '/style.css', data, function(err) {
            if (err) {
                console.log('error', err);
            }
        });

    });
}

function runProgram() {

    makeFileAString(inputFile).then(function(data) {

        var splitter = '<h1>'; // we could have this be a prompted answer
        var array = data.split(splitter);

        var includeInIndex = "";

        if (coverImageExists) {

            fs.mkdir('./' + outDirName + '/images');
            fs.createReadStream('images/cover.jpg').pipe(fs.createWriteStream(outDirName + '/images/cover.jpg'));

            coverImage = "<img src = 'images/cover.jpg' />";

        } else {
            coverImage = "";
        }

        var datetime = new Date();

        var cssLink = "<link rel = 'stylesheet' href='style.css' />";

        var commentDate = '<!-- Generated on ' + datetime + ' with bloom-cli -->';

        var indexStr = commentDate + '<ul>';

        var titleArray = [];

        for (var i = 0; i < array.length; i++) {

            var next = i + 1;

            var title = array[i].split('</h1>')[0];
            if (title == '') {
                title = 'untitled'
            };

            var nextTitle = array[next].split('</h1>')[0];

            if (nextTitle == '') {
                nextTitle = 'untitled'
            };

            if (nextTitle == 'index') {
                title = 'pre'
            }

            var hideThis = false;

            if (i !== 0 && nextTitle !== 'index') {

                if (title.indexOf('%') > -1) {
                    hideThis = true;
                }

                // fix where first one breaks

                var webTitle = title !== 'untitled' ? title.toLowerCase().replace(new RegExp(' ', 'g'), '_') : Math.random();
                webTitle = webTitle.replace(new RegExp('#', 'g'), '');
                webTitle = webTitle.replace(new RegExp('\\.', 'g'), '-');

                console.log('webTitle', htmlEncode(webTitle));

                var nextWebTitle = nextTitle.toLowerCase().replace(new RegExp(' ', 'g'), '_');
                nextWebTitle = nextWebTitle.replace(new RegExp('#', 'g'), '');
                nextWebTitle = nextWebTitle.replace(new RegExp('\\.', 'g'), '-');

                //console.log('nextWebTitle', htmlEncode(nextWebTitle));

                if (title !== 'index' && title !== '') {

                    indexStr = hideThis ? indextStr : indexStr + "<li><a href = '" + htmlEncode(webTitle) + ".html'>" + title + "</a></li>";

                }

                var backButton = title == "index" ? "" : "<a class = 'button-back' href = 'index.html'>back</a>";
                var nextButton = title == 'index' && nextWebTitle.indexOf('%') > -1 ? "" : "<br><br><a class = 'button-next' href = '" + htmlEncode(nextWebTitle) + ".html'>next</a>";

                var fileContents;

                fileContents = backButton + splitter + array[i] + nextButton;

                var wordCount = fileContents.split(' ').length;

                //spit out the file in this next part

                if (title !== 'index' && !hideThis) {

                    fs.writeFile(outDirName + '/' + htmlEncode(webTitle) + '.html', global.headerString + fileContents, function(err) { // this is htmlencoding automatically so we don't do it here

                        if (err) {

                            console.log('error2', err);
                        }

                    });

                } else {

                    includeInIndex = fileContents.replace('<h1>index</h1>', '');

                } //after making file, gather stuff for index file

                if (global.showWords == true && title !== '') {

                    title = title + ' (' + wordCount + ' words)';

                    indexStr = indexStr.replace(new RegExp(title), title + ' (' + wordCount + ' words)');

                }

                titleArray.push(title);

            }

        }


        if (global.alphabetical) {
            titleArray.sort();

            indexStr = commentDate + '<ul>'; //start over with this string
            titleArray.map(function(one) {

                if (one.indexOf('%') > -1) {
                    return false
                }
                if (one === "index") {
                    return false;
                }

                var nonWebTitle = one.split(' (');
                var webTitleTwo = one.toLowerCase().replace(new RegExp(' ', 'g'), '_')
                webTitleTwo = webTitleTwo.split('_(');

                if (webTitleTwo.length > 1 && !hideThis) {
                    indexStr += "<li><a href = '" + htmlEncode(webTitleTwo[0]) + ".html'>" + nonWebTitle[0] + "</a> (" + nonWebTitle[1] + "</li>";
                } else {
                    indexStr += "<li><a href = '" + htmlEncode(webTitleTwo[0]) + ".html'>" + nonWebTitle[0] + "</a></li>";
                }

            });

        }

        fs.writeFile(outDirName + '/index.html', (global.headerString + indexStyles + coverImage + global.projectTitle + global.projectSubtitle + includeInIndex + indexStr + "</ul></body></html>"), function(err) {

            if (err) {

                console.log('error3', err);
            }

            //launch the static site in the user's browser

            if (global.ftp) {

                var conn = new vinylFtp({
                    host: global.hostname,
                    user: global.username,
                    password: global.password,
                    parallel: 10,
                    log: function(item) {
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
