const chai = require('chai');

const collectImages = require('../funcs/collectImages');

const expect = chai.expect;

describe('Collect images', function(){
	it('finds images in html tags', function () {
		const a = collectImages('<img src ="https://www.something.com/img.png" />');
		expect(a[0]).to.equal('https://www.something.com/img.png');
	});
});
