export default function (object) {
  let newArray = [];
  for (let key in object) {
    newArray.push(object[key].z);
  }
  return newArray;
}
