
const BigNumber = web3.BigNumber;
var Decimal = require('decimal.js');
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();
var TimeStone = require('./helper/increaseTime');


var PRASMToken = artifacts.require('PRASMToken');


function getRandomRange(min, max) {
    return (Math.random() * (max - min)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function now() {
    return parseInt(Date.now()/1000);
}

const TIMESTAMP_SEC = 1000;
const TIMESTAMP_MIN = 1000 * 60;
const TIMESTAMP_HOUR = 1000 * 60 * 60;
const BN_ZERO = new BigNumber(0);
const DECIMAL = 10**18;

contract('PRASMToken test', async (accounts) => {


    beforeEach("Before Test", async() =>{
        await TimeStone.capture();
        instance = await PRASMToken.new({from:accounts[0]});
        tc_success = false;        
    });

    afterEach("After Each", async() => {
        await TimeStone.reset();
        assert.isTrue(tc_success,"TC was not complate");
    });

    /*
    function totalSupply() public view returns (uint256);
    function balanceOf(address who) public view returns (uint256);
    function allowance(address owner, address spender) public view returns (uint256);
    function transfer(address to, uint256 value) public returns (bool);
    function transferFrom(address from, address to, uint256 value) public returns (bool);
    function approve(address spender, uint256 value) public returns (bool);
    string public name;
    string public symbol;
    uint8 public decimals;
    */

    it("Token parameter must be currect.", async function() {
        // total : 4,000,000,000
                   4,000,000,000
        let totalSupply = new BigNumber(4000000000 * DECIMAL);
        let ownerAmount = totalSupply.div(10);
        expect( await instance.name.call()             ).to.deep.equal( "PRASM" );
        expect( await instance.symbol.call()           ).to.deep.equal( "PSM" );
        expect( await instance.totalSupply()           ).to.deep.equal( totalSupply );
        expect( await instance.owner.call()            ).to.deep.equal( accounts[0] );
        expect( await instance.decimals.call()         ).to.deep.equal( new BigNumber(18) );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply );

        tc_success = true;
    });

    it("The token transfer must increase the balance of the recipient.", async function() {

        let value = 100*DECIMAL;
        await instance.transfer( accounts[1], value ).should.be.fulfilled; 

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( new BigNumber(value) );

        tc_success = true;
    });

    it("The token transfer must reduce the balance of the sender.", async function() {
        let value = 100*DECIMAL;
        let totalSupply = new BigNumber(4000000000 * DECIMAL);
        let ownerAmount = new BigNumber(totalSupply/10);

        await instance.transfer( accounts[1], value ).should.be.fulfilled; 
        
        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( new BigNumber(value) );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply.sub(value) );

        tc_success = true;
    });

    it("Transmission beyond balance should reject", async function() {

        let value = 100*DECIMAL;
        let totalSupply = new BigNumber(4000000000 * DECIMAL);
        let ownerAmount = new BigNumber(totalSupply/10);

        await instance.transfer( accounts[1], value ).should.be.fulfilled; 

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( new BigNumber(value) );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply.sub(value) );

        await instance.transfer( accounts[1], totalSupply                     ).should.be.rejectedWith('revert');
        await instance.transfer( accounts[2], totalSupply, {from:accounts[1]} ).should.be.rejectedWith('revert');

        tc_success = true;
    });
    // function distributeWithLockup(address _to, uint256 _value, uint256 _releaseStart, uint256 _releaseRate) public onlyOwner returns (bool)
    it("After the distribution, the balance of the tokenholder should be increased", async function() {

        let value = new BigNumber(100*DECIMAL);
        let totalSupply = new BigNumber(4000000000 * DECIMAL);

        expect( await instance.totalSupply()           ).to.deep.equal( totalSupply );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply );

        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()+1000), new BigNumber(100) ).should.be.fulfilled;

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply.sub(value) );
        tc_success = true;
    });

    // Token Transfer must be denied when locked
    it("Token holder cannot transfer when holder is locked", async function() {

        let value = new BigNumber(100*DECIMAL);
        let totalSupply = new BigNumber(4000000000 * DECIMAL);

        expect( await instance.totalSupply()           ).to.deep.equal( totalSupply );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply );

        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()+1000), new BigNumber(100) ).should.be.fulfilled;

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply.sub(value) );

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.rejectedWith('revert');
        await instance.transfer( accounts[2], 10, {from:accounts[1]}   ).should.be.rejectedWith('revert');

        tc_success = true;
    });

    it("Token holder should transfer when afrer release", async function() {

        let value = new BigNumber(100*DECIMAL);
        let totalSupply = new BigNumber(4000000000 * DECIMAL);

        expect( await instance.totalSupply()           ).to.deep.equal( totalSupply );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply );
        
        
        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()-10), new BigNumber(100) ).should.be.fulfilled;
        
        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply.sub(value) );

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.fulfilled;
        await instance.transfer( accounts[2], 10, {from:accounts[1]}   ).should.be.rejectedWith('revert');

        tc_success = true;
    });

    it("Lockuped holder shoud transfer tokens in recieved token amount not locked", async function() {

        let value = new BigNumber(100*DECIMAL);
        let totalSupply = new BigNumber(4000000000 * DECIMAL);

        expect( await instance.totalSupply()           ).to.deep.equal( totalSupply );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply );
        
       
        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()+100000), new BigNumber(100) ).should.be.fulfilled;
        await instance.distribute( accounts[1], value ).should.be.fulfilled;
        
        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value.mul(2) );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply.sub(value.mul(2)) );

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.fulfilled;
        await instance.transfer( accounts[2], 10, {from:accounts[1]}   ).should.be.rejectedWith('revert');

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );

        tc_success = true;
    });

    // Token transferFrom must be denied when locked
    it("Token holder cannot transferFrom when holder is locked", async function() {

        let value = new BigNumber(100*DECIMAL);
        let totalSupply = new BigNumber(4000000000 * DECIMAL);

        expect( await instance.totalSupply()           ).to.deep.equal( totalSupply );
        expect( await instance.balanceOf( accounts[0]) ).to.deep.equal( totalSupply );

        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()+1000), new BigNumber(100) ).should.be.fulfilled;
        await instance.approve( accounts[2], value, {from:accounts[1]} ).should.be.fulfilled;

        expect( await instance.allowance(accounts[1],accounts[2]) ).to.deep.equal( value );

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.rejectedWith('revert');
        await instance.transferFrom( accounts[1], accounts[3], value, {from:accounts[2]}).should.be.rejectedWith('revert');

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );
        expect( await instance.balanceOf( accounts[2]) ).to.deep.equal( BN_ZERO );
        expect( await instance.balanceOf( accounts[3]) ).to.deep.equal( BN_ZERO );
        

        tc_success = true;
    });

    it("Token holder should transferFrom when afrer release", async function() {

        let value = new BigNumber(100*DECIMAL);
        let totalSupply = new BigNumber(4000000000 * DECIMAL);        
        
        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()-10), new BigNumber(100) ).should.be.fulfilled;
        await instance.approve( accounts[2], value, {from:accounts[1]} ).should.be.fulfilled;

        expect( await instance.allowance(accounts[1],accounts[2]) ).to.deep.equal( value );

        await instance.transferFrom( accounts[1], accounts[3], value, {from:accounts[2]}).should.be.fulfilled
        await instance.transferFrom( accounts[1], accounts[3], 10, {from:accounts[2]}).should.be.rejectedWith('revert');

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( BN_ZERO );
        expect( await instance.balanceOf( accounts[2]) ).to.deep.equal( BN_ZERO );
        expect( await instance.balanceOf( accounts[3]) ).to.deep.equal( value );

        tc_success = true;
    });

    it("Lockuped holder shoud transferFrom tokens in recieved token amount not locked", async function() {

        let value = new BigNumber(100*DECIMAL);
        let totalSupply = new BigNumber(4000000000 * DECIMAL);        
       
        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()+100000), new BigNumber(100) ).should.be.fulfilled;
        await instance.distribute( accounts[1], value ).should.be.fulfilled;
        await instance.approve( accounts[2], value, {from:accounts[1]} ).should.be.fulfilled;
        
        expect( await instance.allowance(accounts[1],accounts[2]) ).to.deep.equal( value );

        await instance.transferFrom( accounts[1], accounts[3], value, {from:accounts[2]}).should.be.fulfilled
        await instance.transferFrom( accounts[1], accounts[3], 10, {from:accounts[2]}).should.be.rejectedWith('revert');

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );
        expect( await instance.balanceOf( accounts[2]) ).to.deep.equal( BN_ZERO );
        expect( await instance.balanceOf( accounts[3]) ).to.deep.equal( value );

        tc_success = true;
    });


    it("Owner can be lockup account after distribute", async function() {

        let value = new BigNumber(100*DECIMAL);
        let totalSupply = new BigNumber(4000000000 * DECIMAL);        
       
        await instance.distribute( accounts[1], value ).should.be.fulfilled;
        await instance.lock( accounts[1], value, new BigNumber(now()+100000), new BigNumber(100) ).should.be.fulfilled;
        
        await instance.approve( accounts[2], value, {from:accounts[1]} ).should.be.fulfilled;
        
        expect( await instance.allowance(accounts[1],accounts[2]) ).to.deep.equal( value );

        await instance.transferFrom( accounts[1], accounts[3], value, {from:accounts[2]}).should.be.rejectedWith('revert');
        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.rejectedWith('revert');

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );
        expect( await instance.balanceOf( accounts[2]) ).to.deep.equal( BN_ZERO );
        expect( await instance.balanceOf( accounts[3]) ).to.deep.equal( BN_ZERO );

        tc_success = true;
    });

    it("Owner can be lockup in holders amount", async function() {

        let value = new BigNumber(100*DECIMAL);

        await instance.distribute( accounts[1], value ).should.be.fulfilled;
        await instance.lock( accounts[1], value+1, new BigNumber(now()+100000), new BigNumber(100) ).should.be.rejectedWith('revert');;
               

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.fulfilled

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( BN_ZERO );
        expect( await instance.balanceOf( accounts[2]) ).to.deep.equal( value );

        tc_success = true;
    });

    it("Owner can be unlock accounts", async function() {

        let value = new BigNumber(100*DECIMAL);

        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()+1000), new BigNumber(100) ).should.be.fulfilled;

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.rejectedWith('revert');
        await instance.transfer( accounts[2], 10, {from:accounts[1]}   ).should.be.rejectedWith('revert');

        await instance.unlock( accounts[1] ).should.be.fulfilled;

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.fulfilled;
        await instance.transfer( accounts[2], 10, {from:accounts[1]}   ).should.be.rejectedWith('revert');

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( BN_ZERO );
        expect( await instance.balanceOf( accounts[2]) ).to.deep.equal( value );        

        tc_success = true;
    });

    

    it("Owner can lock account after unlocked", async function() {

        let value = new BigNumber(100*DECIMAL);

        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()+1000000), new BigNumber(100) ).should.be.fulfilled;

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.rejectedWith('revert');

        await instance.unlock( accounts[1] ).should.be.fulfilled;
        await instance.lock( accounts[1], value, new BigNumber(now()+100000), new BigNumber(100) ).should.be.fulfilled;


        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.rejectedWith('revert');      

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );
  
        
        tc_success = true;
    });

    it("Owner can lock account after unlocked2", async function() {

        let value = new BigNumber(100*DECIMAL);

        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()+1000000), new BigNumber(100) ).should.be.fulfilled;

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.rejectedWith('revert');

        await instance.unlock( accounts[1] ).should.be.fulfilled;

        await instance.transfer( accounts[2], value.div(2), {from:accounts[1]}).should.be.fulfilled;

        await instance.lock( accounts[1], value, new BigNumber(now()+100000), new BigNumber(100) ).should.be.rejectedWith('revert');
        await instance.lock( accounts[1], value.div(2), new BigNumber(now()+100000), new BigNumber(100) ).should.be.fulfilled


        await instance.transfer( accounts[2], value.div(2), {from:accounts[1]}).should.be.rejectedWith('revert');    
        
        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value.div(2) );
        expect( await instance.balanceOf( accounts[2]) ).to.deep.equal( value.div(2) );


        
        tc_success = true;
    });

    //Time slide lock test
    it("The token is unlocked every month since the first unlock.", async function() {

        let value = new BigNumber(100*DECIMAL);
        let unlockAmountPerMonth = value.div(10);

        await instance.distributeWithLockup( accounts[1], value, new BigNumber(now()), new BigNumber(10) ).should.be.fulfilled;

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value );

        await instance.transfer( accounts[2], value, {from:accounts[1]}).should.be.rejectedWith('revert');

        await instance.transfer( accounts[2], unlockAmountPerMonth, {from:accounts[1]}).should.be.fulfilled;
        await instance.transfer( accounts[2], unlockAmountPerMonth, {from:accounts[1]}).should.be.rejectedWith('revert');

        expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value.sub(unlockAmountPerMonth) );
        expect( await instance.balanceOf( accounts[2]) ).to.deep.equal( unlockAmountPerMonth );

        for(i=1;i<10;i++){
            await TimeStone.increaseTime( 3600*24*30 );

            await instance.transfer( accounts[2], unlockAmountPerMonth, {from:accounts[1]}).should.be.fulfilled;
            await instance.transfer( accounts[2], unlockAmountPerMonth, {from:accounts[1]}).should.be.rejectedWith('revert');

            expect( await instance.balanceOf( accounts[1]) ).to.deep.equal( value.sub(unlockAmountPerMonth.mul(i+1)) );
            expect( await instance.balanceOf( accounts[2]) ).to.deep.equal( unlockAmountPerMonth.mul(i+1) );

            console.log("accouts[1] : ",await instance.balanceOf( accounts[1]) );
            console.log("accouts[2] : ",await instance.balanceOf( accounts[2]) );
            console.log("locked     : ",await instance.showLockState( accounts[1]) );
        }

        tc_success = true;
    });
    

});

