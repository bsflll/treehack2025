import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const complaintsPath = path.join(process.cwd(), 'data/complaints.json')

export async function GET() {
  try {
    const fileContents = fs.readFileSync(complaintsPath, 'utf8')
    const data = JSON.parse(fileContents)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read complaints' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const complaint = await req.json()
    
    // Validate the complaint data
    if (!complaint.issue_type || !complaint.coordinates) {
      return NextResponse.json({ error: 'Invalid complaint data' }, { status: 400 })
    }

    // Read existing data
    const fileContents = fs.readFileSync(complaintsPath, 'utf8')
    const data = JSON.parse(fileContents)

    // Add new complaint
    data.complaints.push(complaint)

    // Write back to file
    fs.writeFileSync(complaintsPath, JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating complaints:', error)
    return NextResponse.json({ error: 'Failed to update complaints' }, { status: 500 })
  }
} 