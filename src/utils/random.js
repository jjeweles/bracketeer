import uniqid from 'uniqid'

export default function generateId() {
  // Generate a random 15-character alphanumeric string
  return uniqid()
}
