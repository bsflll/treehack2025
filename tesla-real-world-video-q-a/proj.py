import os
import csv
import cv2
import base64
import pandas as pd
import functools
import asyncio  # ( New )
from openai import OpenAI

# Initialize the OpenAI client.
# If you have the OPENAI_API_KEY environment variable set, this may work directly.
# Otherwise, specify your API key as:
num_frames = 5
if "gemini" in model:
    client = OpenAI(
        api_key=os.getenv('GEMINI_API_KEY'),
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )
else:
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

QUESTIONS_CSV = 'questions.csv'
VIDEOS_FOLDER = 'videos'
RESULTS_CSV = 'result.csv'

def encode_image(frame_bgr):
    """
    Encode an OpenCV (BGR) frame to base64 JPEG.
    """
    # Convert frame to JPEG in memory:
    # Note: cv2.imencode expects BGR images (default opencv format).
    ret, buffer = cv2.imencode('.jpg', frame_bgr)
    if not ret:
        return None
    return base64.b64encode(buffer).decode('utf-8')

num_frames=5
def extract_frames(video_path):
    """
    Extract n frames from the video at equally spaced intervals.
    
    For n > 1, frames are extracted at:
      t = 0, t = duration * (1/(n-1)), t = duration * (2/(n-1)), ..., t = duration.
    For n == 1, a single frame is extracted at t = 0.
    
    A small offset is applied to the final time point (t = duration) to avoid potential read issues.
    
    Returns:
      A list of n frames in BGR format (as numpy arrays), or None for any frame where extraction fails.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video '{video_path}'")
        return [None] * num_frames

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    
    # Check for valid metadata
    if fps <= 0 or frame_count <= 0:
        print(f"Warning: Could not read FPS or frame count for '{video_path}'")
        cap.release()
        return [None] * num_frames

    duration = frame_count / fps
    frames = []

    # Determine the time points for extraction
    if num_frames == 1:
        time_points = [0]
    else:
        # Evenly spaced time points from 0 to duration
        time_points = [duration * i / (num_frames - 1) for i in range(num_frames)]
        # Apply a slight offset to the last frame similar to the original function
        time_points[-1] = max(duration - 0.001, 0)

    for t in time_points:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)  # Set position in milliseconds
        ret, frame = cap.read()
        frames.append(frame if ret else None)

    cap.release()
    return frames

def call_openai_vision(question_text, frames):
    """
    Sends the question text plus multiple frames (converted to base64) to the
    gpt-4o-mini (vision-capable) model using the new `client.chat.completions.create(...)`
    approach. Returns the model's answer as a string.
    
    If you have a different model name (e.g. 'o3-mini'), you can update it here.
    You can also add reasoning parameters like 'reasoning_effort' or 'store' if needed.
    """
    # Build the message content array.
    content_list = []
    
    # First, the question itself as text
    content_list.append({
        "type": "text",
        "text": f"Question: {question_text}\n"
                f"The video has {num_frames} frames from a driving video attached. Account for all laws and check your answer 2 times. Look at every part of the image. Provide the best choice (A, B, C, D...). In your final response, provide only the letter choice and nothing else (not even periods)."
    })
    
    # For each frame, convert to base64 and add to the content list (if frame is not None).
    for i, frame in enumerate(frames):
        if frame is None:
            continue
        base64_str = encode_image(frame)
        if base64_str:
            content_list.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_str}"
                },
            })

    try:
        # Example call with a vision-capable model named "gpt-4o-mini".
        # Adjust model name, reasoning parameters, or store as needed.
        response = client.chat.completions.create(
            model="o1",
            reasoning_effort="high",   # If needed
            # store=True,                 # If you want to store conversation
            messages=[
                {
                    "role": "user",
                    "content": content_list,
                }
            ],
        )
        # The response structure typically has response.choices -> list of completions
        # and then .message.content or .message for the text. The snippet below may need
        # slight adjustment depending on your openai library version.
        if response.choices and len(response.choices) > 0:
            # Many models return the text in response.choices[0].message.content
            answer_text = response.choices[0].message.content
            return answer_text.strip()
        else:
            print("Warning: No completion in response")
            return ""
    except Exception as e:
        print(f"Error calling OpenAI model: {e}")
        return ""
async def call_openai_vision_async(question_text, frames):
    loop = asyncio.get_event_loop()
    # Use functools.partial to freeze function + arguments
    func = functools.partial(call_openai_vision, question_text, frames)
    # schedule in a thread pool to avoid blocking the event loop
    return await loop.run_in_executor(None, func)

# ( New ) -- async helper to process each question
async def process_question(row):
    qid = str(row['id']).zfill(5)
    question_text = str(row['question'])
    video_filename = f"{qid}.mp4"
    video_path = os.path.join(VIDEOS_FOLDER, video_filename)

    if not os.path.exists(video_path):
        print(f"Video not found for ID={qid} at {video_path}. Skipping.")
        return {"id": qid, "answer": ""}
    frames = extract_frames(video_path)
    # ( Changed ) call the async version
    answer = await call_openai_vision_async(question_text, frames)
    print(f"Thread done: qid={qid}, answer={answer}")
    return {"id": qid, "answer": answer}

# ( Changed ) -- main function is now async
async def main_async():
    questions_df = pd.read_csv(QUESTIONS_CSV)
    tasks = []

    # Create a task for each row (question)
    for _, row in questions_df.iterrows():
        tasks.append(asyncio.create_task(process_question(row)))

    # Run them all in parallel
    results = await asyncio.gather(*tasks)

    # Write CSV
    with open(RESULTS_CSV, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["id", "answer"])
        writer.writeheader()
        for r in results:
            writer.writerow(r)

    print(f"Results written to {RESULTS_CSV}")

# ( Changed ) -- use asyncio.run(...) to start
if __name__ == "__main__":
    asyncio.run(main_async())

# def main():
#     # Load questions from questions.csv
#     questions_df = pd.read_csv(QUESTIONS_CSV)

#     results = []
#     for _, row in questions_df.iterrows():
#         qid = str(row['id']).zfill(5)
#         question_text = str(row['question'])

#         video_filename = f"{qid}.mp4"
#         video_path = os.path.join(VIDEOS_FOLDER, video_filename)

#         if not os.path.exists(video_path):
#             print(f"Video not found for ID={qid} at {video_path}. Skipping.")
#             results.append({"id": qid, "answer": ""})
#             continue

#         # Extract 5 frames
#         frames = extract_frames(video_path)

#         # Call the new OpenAI vision endpoint
#         answer = call_openai_vision(question_text, frames)

#         # For multiple-choice questions, you might want to parse the returned text
#         # to extract exactly "A", "B", "C", etc. Here we store the raw answer.
#         results.append({"id": qid, "answer": answer})
#         print(f"Answer for ID={qid}: {answer}")

#     # Write results to CSV
#     with open(RESULTS_CSV, mode='w', newline='', encoding='utf-8') as f:
#         writer = csv.DictWriter(f, fieldnames=["id", "answer"])
#         writer.writeheader()
#         for r in results:
#             writer.writerow(r)

#     print(f"Results written to {RESULTS_CSV}")

# if __name__ == "__main__":
#     main()