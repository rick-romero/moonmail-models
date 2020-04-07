module.exports.debug = function() {
  if(process.env.DEBUG){
    console.log.apply(console, arguments);
  }
}
