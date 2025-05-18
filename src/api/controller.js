import PocketBase from 'pocketbase'
import generateId from '../utils/random'

const pb = new PocketBase('http://127.0.0.1:8090')

export default async function addBowler(name) {
  const result = await pb.collection('users').listAuthMethods()
  console.log('Auth methods: ' + JSON.stringify(result))

  // assumes you have a “bowlers” collection in PB
  const data = {
    id: generateId(),
    name: name
  }
  console.log('Data: ' + JSON.stringify(data))
  const record = await pb.collection('bowlers').create(data)
  return {
    success: true,
    data: record
  }
}
