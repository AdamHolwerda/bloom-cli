const chai = require('chai');
const expect = chai.expect;

const toWebTitle = require('../funcs/toWebTitle');

describe('Converts a title to a web title', function(){
	it('converts a title to a web title', function () {
		const a = toWebTitle('This Is A Title That Should Become A Web Title');
		expect(a).to.equal('this-is-a-title-that-should-become-a-web-titlef8089122be5b4236ffa00655f2c5a8c1');
	});
});
