"use client";
import { useState, useEffect, FormEvent } from "react";
import { TfiAlignJustify, TfiAngleLeft } from "react-icons/tfi";
import { Message } from "@/lib/models/message_model";
import run from "@/lib/gemini";
import recomendationData from "@/recomendation.json";
import { Room } from "@/lib/models/room_model";
import axios from "axios";  



export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRecomendationClicked, setIsRecomendationClicked] = useState(false);

  const [messagesData, setMessagesData] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [randomRecommendations, setRandomRecommendations] = useState<
    typeof recomendationData
  >([]);

  const [roomId, setRoomId] = useState("");
  const [roomData, setRoomData] = useState<Room[]>([]);

  useEffect(() => {
    const shuffledRecommendations = [...recomendationData].sort(
      () => 0.5 - Math.random()
    );
    setRandomRecommendations(shuffledRecommendations.slice(0, 4));
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleRecomendation = () => {
    setIsRecomendationClicked(!isRecomendationClicked);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/get_rooms`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        setRoomData(response.data);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };
    fetchData();

  }, []);


  const makeRoom = async (roomName: string): Promise<string> => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/makeroom`,
        { name: roomName },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const currRoomId = response.data.room_id; // Mendapatkan room_id dari respons
      console.log(currRoomId);
      setRoomId(currRoomId);
      // console.log(roomId);
      setRoomData((prevRooms) => [
        ...prevRooms,
        { id: currRoomId, name: roomName },
      ]);
      return currRoomId; // Mengembalikan ID room yang baru dibuat
    } catch (error) {
      console.error("Error creating room: ", error);
      throw error; // Melempar error jika pembuatan room gagal
    }
  };

  const sendMessageToApi = async (message: Message, room_id: string) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/create_message`,
        {
          room_id: room_id,
          sender: message.sender,
          content: message.content,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error sending message to API: ", error);
    }
  };

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (newMessage.trim() !== "") {
      const userMessage: Message = { content: newMessage, sender: "user" };
      const updatedMessages = [...messagesData, userMessage];
      setMessagesData(updatedMessages);
      setNewMessage("");
      setLoading(true);

      try {
        // Menunggu pembuatan room jika roomId masih kosong
        if (roomId === "") {
          // await makeRoom(userMessage.content); // Menunggu makeRoom selesai
          let newRoomId = await makeRoom(userMessage.content);
          console.log(newRoomId);
          await sendMessageToApi(userMessage, newRoomId);
          const responseText = await run(newMessage);
          const botMessage: Message = { content: responseText, sender: "bot" };
          setMessagesData((prevMessages) => [...prevMessages, botMessage]);
          await sendMessageToApi(botMessage, newRoomId);
        } else {
          // Mengirim pesan ke API setelah room ID telah tersedia
          // console.log(roomId);
          await sendMessageToApi(userMessage, roomId);

          // Mendapatkan respons dari AI
          const responseText = await run(newMessage);
          const botMessage: Message = { content: responseText, sender: "bot" };
          setMessagesData((prevMessages) => [...prevMessages, botMessage]);

          // Mengirim pesan bot ke API
          await sendMessageToApi(botMessage, roomId);
        }
      } catch (error) {
        console.error("Error handling message: ", error);
      } finally {
        setLoading(false);
      }
    }
  };;

  const handleRecommendationClick = async (question: string) => {
    setNewMessage(question); 
    await handleSendMessage({ preventDefault: () => {} } as FormEvent); 
  };

  const setMessageRoom = async (roomId: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/get_room_messages?room_id=${roomId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      setRoomId(roomId);
      setMessagesData(response.data);
    } catch (error) {
      console.error("Error fetching quiz data: ", error);
    }
  };

  return (
    <div className="flex flex-row">
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-lg z-50 transition-transform duration-300 overflow-auto ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 flex flex-row justify-between bg-slate-200">
          <h2 className="text-xl font-bold">History</h2>
          <button onClick={toggleSidebar}>
            <TfiAngleLeft />
          </button>
        </div>
        <div className="mx-2">
          {roomData.map((room, index) => (
            <div key={index}>
              <div
                className="my-2 border-b-2 bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1 cursor-pointer"
                onClick={() => setMessageRoom(room.id)}
              >
                <div className="text-lg font-bold">{room.name}</div>
                {/* <div className="text-sm">{ro}</div> */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`bg-slate-200 flex flex-col w-full min-h-screen ${
          isSidebarOpen ? "ml-0 sm:ml-72" : ""
        }`}
      >
        {/* Top Button for Sidebar */}
        <div className="top-0">
          <div className="my-2 mx-2">
            {!isSidebarOpen ? (
              <button
                onClick={toggleSidebar}
                className="flex gap-2 items-center"
              >
                <TfiAlignJustify />
                <span className="font-bold">Assistant Chat</span>
              </button>
            ) : (
              <span className="font-bold">Assistant Chat</span>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow mx-2 overflow-auto">
          {messagesData.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`mt-2 ${
                  message.sender === "user"
                    ? "mr-2 bg-blue-400 rounded-l-lg rounded-tr-lg"
                    : "ml-2 bg-white rounded-r-lg rounded-tl-lg max-w-3xl mr-2"
                } py-1 px-2`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start items-center h-12 ml-2">
              <div className="flex items-center bg-slate-300 rounded-xl py-4 px-3">
                <div className="w-2 h-2 bg-gray-200 rounded-full animate-bounce1 mr-1"></div>
                <div className="w-2 h-2 bg-gray-200 rounded-full animate-bounce2 mr-1"></div>
                <div className="w-2 h-2 bg-gray-200 rounded-full animate-bounce3"></div>
              </div>
            </div>
          )}
        </div>
        {/* Recommendation */}
        {!isRecomendationClicked && (
          <div>
            <div className="text-xs sm:text-lg justify-center flex text-black/20">
              Recommendation Question For You
            </div>
            <div className="mx-4 justify-center sm:flex sm:flex-row sm:gap-4">
              {randomRecommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="my-2 border-b-2 bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1 hover:border-[1px] hover:border-black cursor-pointer"
                  onClick={() => {
                    handleRecommendationClick(recommendation.question);
                    toggleRecomendation();
                  }}
                >
                  <div className="text-xs sm:text-lg">{recommendation.question}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input Form */}
        <div className="mx-2 sticky bottom-0 bg-slate-200 z-30">
          <form onSubmit={handleSendMessage} className="flex flex-row">
            <input
              type="text"
              placeholder="Type a message..."
              className="my-2 mx-2 w-full h-10 px-2 border-slate-900 rounded-md"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-blue-400 h-10 my-2 rounded-md px-5 mr-2 hover:bg-blue-600"
              disabled={loading}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
