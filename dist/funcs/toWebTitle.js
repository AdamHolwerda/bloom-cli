const md5 = require('md5');
module.exports = (str, contents) => {
    if (typeof str === 'string') {
        const titleHash = contents ? md5(contents) : md5(str);
        if (str === '') {
            return titleHash;
        }
        let webTitle = str.toLowerCase();
        webTitle = webTitle.replace(new RegExp(' ', 'g'), '-');
        webTitle = webTitle.replace(new RegExp('#', 'g'), '');
        webTitle = webTitle.replace(new RegExp(',', 'g'), '');
        webTitle = webTitle.replace(new RegExp('\\.', 'g'), '');
        webTitle = webTitle.replace(new RegExp("['’]", 'g'), '');
        webTitle = webTitle.replace(new RegExp('\\(', 'g'), '');
        webTitle = webTitle.replace(new RegExp('\\)', 'g'), '');
        webTitle = webTitle.replace(new RegExp(':', 'g'), '');
        webTitle = webTitle.replace(new RegExp(/\?/, 'g'), '');
        webTitle = webTitle.replace(new RegExp(/\!/, 'g'), '');
        webTitle = webTitle.replace(new RegExp(/\%/, 'g'), '');
        webTitle = webTitle.replace(new RegExp('&39;', 'g'), '');
        webTitle = webTitle.replace(new RegExp('&quot;', 'g'), '');
        webTitle = webTitle.replace(new RegExp('“', 'g'), '');
        webTitle = webTitle.replace(new RegExp('”', 'g'), '');
        webTitle = webTitle.replace(new RegExp('&', 'g'), 'and');
        return webTitle + titleHash;
    }
    else {
        throw 'toWebTitle expects a string';
    }
};
//# sourceMappingURL=toWebTitle.js.map