export default (incoming, key, rev) => {
  let d = incoming.sort((a, b) => {
    let x = a[key];
    let y = b[key];
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  });
  if (rev) {
    d.reverse();
  }
  return d;
};