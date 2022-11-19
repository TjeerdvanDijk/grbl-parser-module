export function parseCoordinates(position) {
  // example input: "23.3242,102.2234,0.4200"
  let coordinates = position.split(",")
  return {
    x: parseFloat(coordinates[0]),
    y: parseFloat(coordinates[1]),
    z: parseFloat(coordinates[2])
  }
}
