module.exports = (string: string) => {
    //there might be linked images in the text, collect them
    //copy them to the index-bloomed folder
    const imgGex = /([a-z\-_0-9/:.]*\.(jpg|jpeg|png|gif))/gi;

    const images = string.match(imgGex);

    return images;
};
