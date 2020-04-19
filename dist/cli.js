#! /usr/bin/env node

const collectImages = require('../funcs/collectImages');
const toWebTitle = require('../funcs/toWebTitle');

const fs = require('fs-extra'); // get fileSystem
const concatStream = require('concat-stream'); //put a streaming chunked file into one glob
const q = require('q'); //so we can defer
const inquirer = require('inquirer'); //so we can ask questions
const open = require('open'); //so we can open files
const vinylFs = require('vinyl-fs');
const striptags = require('striptags');
const vinylFtp = require('vinyl-ftp');
const removeMD = require('remove-markdown');
const entities = require('entities');
const ssmlVal = require('ssml-validator');
const typeset = require('typeset');
const { replaceQuotes } = require('curly-q');
const shell = require('shelljs');

const bloomfile = './bloom.json';

global.headerString = '';
global.headerMarkup = '';
global.projectTitle = '';
global.projectSubtitle = '';
global.projectAuthor = '';
global.sequentialLinks = false;
global.showWords = false;
global.hideIncomplete = true;
global.alphabetical = false;
global.ftp = false;
global.hostname = '';
global.username = '';
global.password = '';
global.remotePath = '';
global.ssml = false;
global.mp3 = false;
global.googleAnalyticsID = '';
global.googleAnalyticsScript = `<script>
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
ga('create', 'bloom-googleAnalyticsID', 'auto');
ga('send', 'pageview');
</script>`;

global.bloomFileSettings = {};
global.useBloomFile = false;
global.makeBloomFile = false;

const userArgs = process.argv.slice(2);

let fileToBloomFrom = userArgs[0];

if (!fileToBloomFrom) {
    fileToBloomFrom = 'index.html'; //assume it's index.html if they didn't provide a file
}

const isThereABloomFile = fs.existsSync(bloomfile);

if (isThereABloomFile) {
    fs.readJson(bloomfile, (error, data) => {
        if (error) {
            console.log(error);
        }

        Object.assign(global.bloomFileSettings, data);
    });
}

const inputFile = fs.createReadStream(fileToBloomFrom);
const headerFileExists = fs.existsSync(__dirname + '/header.html');

let headerFile = '';

if (headerFileExists) {
    headerFile = fs.createReadStream(__dirname + '/header.html');
}

const cssFileExists = fs.existsSync('css/style.css');

let cssFile;

if (cssFileExists) {
    cssFile = fs.createReadStream('css/style.css');
}

const indexStyles = `<style>ul{margin-left:0; padding-left:0; list-style-type:none;}
    ul li{margin-left:0; padding-left:0;} 
    li {color:#aaa;} 
    a {color:#444;} 
    a:visited{color:black} 
    h5 {font-size:26px;}</style>`;

const coverImageExists = fs.existsSync('images/cover.jpg');

const outDirName = fileToBloomFrom.replace('.html', '') + '-bloomed';

const imageFolderExists = fs.existsSync('./' + outDirName + '/images');

let coverImage;

function answersCallback(answers) {
    global.alphabetical = answers.alphabetical;
    global.projectTitle = answers.title;
    global.projectSubtitle = answers.subtitle;
    global.projectAuthor = answers.author;
    global.mp3 = answers.mp3;
    global.googleAnalyticsID = answers.googleAnalyticsID;
    global.showWords = answers.words;
    global.ssml = answers.ssml;
    global.sequentialLinks = answers.sequential;
    global.makeBloomFile = answers.makeBloomFile;
    global.ftp = answers.ftp;
    global.hideIncomplete = answers.hideIncomplete;

    global.headerMarkup = global.headerString.replace(
        '<title></title>',
        '<title>' + answers.title + '</title>'
    );

    if (answers.ftp) {
        inquirer
            .prompt([
                {
                    name: 'hostname',
                    message:
                        'Enter your hostname (exclude ftp:// or www prefixes)'
                },
                {
                    name: 'username',
                    message: 'Enter your username for that host'
                },
                {
                    name: 'password',
                    type: 'password',
                    message: 'Enter your password for that host'
                },
                {
                    name: 'remotePath',
                    message:
                        "Type a remote directory you'd like to bloom into (ex: html/project)"
                }
            ])
            .then((moreAnswers) => {
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
    inquirer
        .prompt([
            {
                name: 'title',
                message: 'What title should appear on the index page?'
            },
            {
                name: 'subtitle',
                message: 'What subtitle should appear below the title?'
            },
            {
                name: 'author',
                message: 'Author name, if any?'
            },
            {
                type: 'confirm',
                name: 'words',
                default: false,
                message: 'Show word counts next to index links?'
            },
            {
                type: 'confirm',
                name: 'alphabetical',
                default: false,
                message: 'Should the links on the index page be alphabetized?'
            },
            {
                type: 'confirm',
                name: 'sequential',
                default: false,
                message:
                    'Should each page link to the next page instead of back to index page?'
            },
            {
                type: 'confirm',
                name: 'hideIncomplete',
                default: true,
                message: 'Hide incomplete stories with % in the title?'
            },
            {
                type: 'confirm',
                name: 'ssml',
                default: false,
                message:
                    'Generate a folder of SSML for using with Amazon Polly?'
            },
            {
                type: 'confirm',
                name: 'mp3',
                default: false,
                message:
                    'Use SSML to make MP3s and add an audio player to each page?'
            },
            {
                name: 'googleAnalyticsID',
                type: 'input',
                default: '',
                message:
                    'Google Analytics ID (if Bloom should add a script on every page).'
            },
            {
                type: 'confirm',
                name: 'makeBloomFile',
                default: false,
                message:
                    'Create/overwrite bloom.json file in this folder, with these answers?'
            },
            {
                type: 'confirm',
                name: 'ftp',
                default: false,
                message:
                    'Bloom can upload your files for you, if you provide FTP details. Yeah?'
            }
        ])
        .then((answers) => {
            answersCallback(answers);
        });
}

if (isThereABloomFile) {
    inquirer
        .prompt([
            {
                name: 'useBloomFile',
                message: "Use the settings in this folder's bloomfile?",
                type: 'confirm',
                default: true
            }
        ])
        .then((answer) => {
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
    // make a new deferred object so we can chain
    const deferred = q.defer();

    file.pipe(
        concatStream((data) => {
            deferred.resolve(data.toString());
        })
    );

    return deferred.promise;
}

function generateBloomFile() {
    const file = bloomfile;
    const obj = {
        title: global.projectTitle,
        author: global.projectAuthor,
        subtitle: global.projectSubtitle,
        words: global.showWords,
        alphabetical: global.alphabetical,
        hideIncomplete: global.hideIncomplete,
        sequential: global.sequentialLinks,
        ssml: global.ssml,
        mp3: global.mp3,
        ftp: global.ftp,
        googleAnalyticsID: global.googleAnalyticsID
    };

    fs.writeJson(file, obj, { spaces: 2 }, (err) => {
        if (err) {
            console.log(err);
        }
    });
}

function numberWithCommas(x) {
    if (!x) {
        return '';
    }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

//PROGRAM STARTS

//make a folder
fs.ensureDir('./' + outDirName, (err) => {
    console.log(err);
});

if (headerFileExists) {
    makeFileAString(headerFile).then((data) => {
        global.headerString = data;
    });
} else {
    console.log('There is no header file');
}

if (cssFileExists) {
    makeFileAString(cssFile).then((data) => {
        fs.outputFile(outDirName + '/style.css', data, (err) => {
            console.log(err);
        });
    });
}

function runProgram() {
    if (global.makeBloomFile) {
        generateBloomFile(); // before anything else, generate a bloomfile if we're supposed to
    }

    if (!imageFolderExists) {
        fs.ensureDir('./' + outDirName + '/images', (err) => {
            console.log(err);
        });
    }

    if (global.ssml) {
        fs.ensureDir('./' + outDirName + '/ssml', (err) => {
            console.log(err);
        });
    }

    makeFileAString(inputFile).then((data) => {
        const splitter = '<h1>'; // we could have this be a prompted answer

        const images = collectImages(data);

        if (images !== null) {
            images.forEach((img) => {
                fs.copy('./' + img, outDirName + '/' + img, (err) => {
                    console.log(err);
                });
            });
        }

        const textArray = data.split(splitter);

        const includeInIndex = '';

        if (coverImageExists) {
            fs.createReadStream('images/cover.jpg').pipe(
                fs.createWriteStream(outDirName + '/images/cover.jpg')
            );

            coverImage = "<img src = 'images/cover.jpg' />";
        } else {
            coverImage = '';
        }

        const datetime = new Date();

        const commentDate =
            '<!-- Generated on ' + datetime + ' with bloom-cli -->';

        let indexStr = commentDate + '<ul>';

        const titleArray = [];
        const webTitleArray = [];
        const analytics =
            global.googleAnalyticsID !== ''
                ? global.googleAnalyticsScript.replace(
                      'bloom-googleAnalyticsID',
                      global.googleAnalyticsID
                  )
                : '';

        for (let i = 0; i < textArray.length; i++) {
            const next = i + 1;
            const last = i - 1;

            let title = i > 0 ? textArray[i].split('</h1>')[0] : 'index';

            let hideThis = false;

            let nextTitle =
                next < textArray.length
                    ? textArray[next].split('</h1>')[0]
                    : 'index';

            let lastTitle = last > 0 ? textArray[last].split('</h1>')[0] : '';

            if (title.indexOf('%') > -1) {
                if (!global.hideIncomplete) {
                    title = title.replace('%', '');
                } else {
                    hideThis = true;
                }
            }

            title = striptags(title); //strip tags
            lastTitle = striptags(lastTitle);
            nextTitle = striptags(nextTitle);

            title = title.replace(new RegExp('&quot;', 'g'), '');
            lastTitle = lastTitle.replace(new RegExp('&quot;', 'g'), '');
            nextTitle = nextTitle.replace(new RegExp('&quot;', 'g'), '');

            const webTitle = toWebTitle(title, textArray[i]);

            const lastWebTitle =
                lastTitle !== '' ? toWebTitle(lastTitle, textArray[last]) : '';

            const nextWebTitle =
                nextTitle !== 'index'
                    ? toWebTitle(nextTitle, textArray[next])
                    : '';

            if (title !== 'index') {
                indexStr = hideThis
                    ? indexStr
                    : indexStr +
                      '<li><a href ="' +
                      webTitle +
                      '".html>' +
                      title +
                      '</a></li>';
            }

            const backButtonMarkup =
                global.sequentialLinks && lastWebTitle !== ''
                    ? `<br><br><a class='button-back' href = 'index.html'>home</a><br><br><a class='button-back' href = '${lastWebTitle}.html'>previous</a>`
                    : "<br/><br/><a class='button-back' href = 'index.html'>back</a>";
            const nextButtonMarkup =
                global.sequentialLinks && nextWebTitle !== ''
                    ? `<br><br><a class='button-next' href = '${nextWebTitle}.html'>next</a><br/><br/><br/><br/>`
                    : "<br><br><a class='button-next' href = 'index.html'>back</a><br><br><br/><br/>";
            const audioMarkup = global.mp3
                ? `<audio controls src='ssml/${webTitle}.mp3' type="audio/mp3" style = 'width:100%;'><p><a href="ssml/${webTitle}.mp3"></a></p></audio><br/><br/>`
                : '';

            const backButton =
                title === 'index' ||
                (lastWebTitle.indexOf('%') > -1 && global.sequentialLinks)
                    ? ''
                    : backButtonMarkup;
            const nextButton =
                title === 'index' || nextWebTitle.indexOf('%') > -1
                    ? ''
                    : nextButtonMarkup;

            let finalText = global.projectAuthor
                ? textArray[i].replace(
                      '</h1>',
                      `</h1><h3>by ${global.projectAuthor} </h3>`
                  )
                : textArray[i];

            let fileContents =
                commentDate +
                backButton +
                splitter +
                audioMarkup +
                finalText +
                nextButton +
                analytics +
                '</body></html>';

            fileContents = replaceQuotes(fileContents);
            fileContents = typeset(fileContents);

            const wordCount = finalText.split(' ').length;

            //spit out the file in this next part

            if (title !== 'index' && !hideThis && webTitle !== '') {
                const thisHeader = global.headerString.replace(
                    '<title></title>',
                    '<title>' + title + '</title>'
                );

                fs.outputFile(
                    outDirName + '/' + webTitle + '.html',
                    thisHeader + fileContents,
                    (err) => {
                        // this is htmlencoding automatically so we don't do it here

                        if (err) {
                            console.log(err);
                        }
                    }
                );

                if (global.ssml) {
                    finalText = finalText.replace(
                        new RegExp(/<br\/>/, 'g'),
                        '-BREAKSPACE-'
                    );

                    let file = entities.decodeHTML(
                        removeMD(splitter + finalText)
                    );

                    const prepend = '<speak>';
                    const append = '</speak>';

                    const authorOrNot = global.projectAuthor
                        ? 'by ' + global.projectAuthor
                        : global.projectAuthor;
                    const breakOrNot = global.projectAuthor
                        ? '<break time = "1s" /> by ' +
                          global.projectAuthor +
                          '<break time = "3s" />'
                        : '<break time = "3s" />';

                    file = file.replace(
                        new RegExp(authorOrNot, 'i'),
                        breakOrNot
                    );

                    file = file.replace(
                        new RegExp(/-BREAKSPACE-/, 'g'),
                        '<break time = "1s" />'
                    );

                    file = file.replace(
                        new RegExp(/\n\n/, 'g'),
                        '<break time = "1s" />'
                    );
                    file = file.replace(
                        new RegExp(/ -- /, 'g'),
                        '<break time = "800ms" />'
                    );
                    file = file.replace(
                        new RegExp(/ - /, 'g'),
                        '<break time = "800ms" />'
                    );
                    file = file.replace(
                        new RegExp(/ – /, 'g'),
                        '<break time = "800ms" />'
                    );
                    file = file.replace(
                        new RegExp(/\n/, 'g'),
                        '<break time = "800ms" />'
                    );
                    file = file.replace(
                        new RegExp(/\? /, 'g'),
                        '?<break time = "500ms" />'
                    );
                    file = file.replace(
                        new RegExp(/\.\.\./, 'g'),
                        '?<break time = "1200ms" />'
                    );

                    file = prepend + file + append;

                    file = ssmlVal.correct(file);

                    fs.outputFile(
                        outDirName + '/ssml/' + webTitle + '.xml',
                        file,
                        (err) => {
                            if (err) {
                                console.log(err);
                            } else if (global.mp3) {
                                fs.pathExists(
                                    outDirName + '/ssml/' + webTitle + '.mp3',
                                    (err, exists) => {
                                        if (err) {
                                            console.log(err);
                                        }

                                        //if the path exists, we already have an mp3 of this version, don't need to make a new one
                                        if (!exists) {
                                            if (!shell.which('tts')) {
                                                //if the user doesn't have tts, we shouldn't try to do this.

                                                shell.echo(
                                                    'You need the tts package to create MP3s.'
                                                );
                                                shell.exit(1);
                                            } else {
                                                let femaleNarrator = false;

                                                const howManyIs =
                                                    file.match(/ i /gi) !== null
                                                        ? file.match(/ i /gi)
                                                              .length
                                                        : 0;
                                                const howManyHes =
                                                    file.match(/ he /gi) !==
                                                    null
                                                        ? file.match(/ he /gi)
                                                              .length
                                                        : 0;
                                                const howManyShes =
                                                    file.match(/ she /gi) !==
                                                    null
                                                        ? file.match(/ she /gi)
                                                              .length
                                                        : 0;

                                                if (
                                                    howManyIs < howManyShes &&
                                                    howManyShes > howManyHes
                                                ) {
                                                    femaleNarrator = true;
                                                }

                                                const genderFlag = femaleNarrator
                                                    ? '--voice Joanna'
                                                    : '--voice Matthew';

                                                //path doesn't exist, user has tts, make mp3 file

                                                shell.exec(
                                                    `tts ${outDirName}/ssml/${webTitle}.xml ${outDirName}/ssml/${webTitle}.mp3 --type ssml --sample-rate 16000 ${genderFlag}`
                                                );
                                            }
                                        }
                                    }
                                );
                            }
                        }
                    );
                }
            } //after making file, gather stuff for index file

            if (global.showWords && title !== '' && title !== 'index') {
                title = title + ' (' + numberWithCommas(wordCount) + ' words)';

                indexStr = indexStr.replace(
                    new RegExp(title),
                    title + ' (' + wordCount + ' words)'
                );
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

            console.log(titleArray, webTitleArray);
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
                indexStr +=
                    "<li><a href = '" +
                    webTitleTwo +
                    ".html'>" +
                    nonWebTitle[0] +
                    '</a> (' +
                    nonWebTitle[1] +
                    '</li>';
            } else {
                indexStr +=
                    "<li><a href = '" +
                    webTitleTwo +
                    ".html'>" +
                    nonWebTitle[0] +
                    '</a></li>';
            }
        });

        const projectAuthor = global.projectAuthor
            ? '<h5>by ' + global.projectAuthor + '</h5>'
            : '';

        const finalFile =
            global.headerMarkup +
            indexStyles +
            coverImage +
            '<h1>' +
            global.projectTitle +
            '</h1> <h2>' +
            global.projectSubtitle +
            '</h2>' +
            projectAuthor +
            includeInIndex +
            indexStr +
            '</ul>' +
            analytics +
            '</body></html>';

        fs.outputFile(outDirName + '/index.html', finalFile, (err) => {
            if (err) {
                console.log(err);
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

                vinylFs
                    .src([outDirName + '/**'], {
                        buffer: false
                    })
                    .pipe(conn.dest(global.remotePath));
            }

            open(outDirName + '/index.html');
        });
    });
}
