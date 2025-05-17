import PocketBase from 'pocketbase'

const pb = new PocketBase('http://127.0.0.1:8090')

export default async function addBowler(name) {
  // assumes you have a “bowlers” collection in PB
  console.log('Adding bowler: ' + name)
  const record = await pb.collection('bowlers').create({ name })
  return record
}
