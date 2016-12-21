const request = require('request');
const url = 'http://zcash.flypool.org/api/miner_new/t1afdgdmPmjEJreiRhAKMm3uEUdS5tFuXM4';
const utils = require('./utils');

(async function(){
  let body = await new Promise(function(resolve,reject){
    request(url, function (error, response, body) {
        if (error || response.statusCode != 200) reject(error);
        else resolve(body);
      });
  });
 let payouts = JSON.parse(body).payouts;
 for(let i =0;i<payouts.length;i++){
  let query = utils.queryFormat('select * from payouts where payoutsid = ?',[payouts[i].id]);
  let result = await utils.P(utils.pool,'query',query);
  if(result.length == 0){
    let query = utils.queryFormat('insert into payouts set payoutsid = ?,amount = ?,miner = ?,start = ?,end = ?,txhash = ?,paidon = ?',[payouts[i].id,payouts[i].amount,payouts[i].miner,payouts[i].start,payouts[i].end,payouts[i].txHash,new Date(payouts[i].paidOn).getTime()]);
    console.log(query);
    await utils.P(utils.pool,'query',query);
  }
  //let avgHashrate = JSON.parse(body).avgHashrate;
 }
}());
