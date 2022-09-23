import React, {useState,useLayoutEffect,useCallback} from 'react'
import {View, Text,Platform,
    KeyboardAvoidingView,StyleSheet} from 'react-native';
import { GiftedChat, Bubble} from 'react-native-gifted-chat'
import { useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useNetInfo} from '@react-native-community/netinfo';


import { db } from '../firebase';


const renderBubble = (props)=> {
    return <Bubble {...props} 
      wrapperStyle={{
          left: {
            backgroundColor: '#00E6BE',
          },
          right: {
            backgroundColor: '#0059F0'
          }
        }} 

      timeTextStyle={{
        left: {
          color: '#000',
        },
        right: {
          color: '#000',
        },
      }}
    />
}


function Chat() {
  const [messages, setMessages] = useState([]);
  const route = useRoute();
  const netInfo = useNetInfo();
  const username = route.params.name

  useLayoutEffect(() => {
    let unsubscribe = () => { }
    if (netInfo.type !== 'unknown' && netInfo.isInternetReachable === false) {
      getMessages()
    }
    else {
      const firebaseQuery = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(firebaseQuery, (snapshot) => {
        setMessages(
          snapshot.docs.map(doc => {
            const { _id, createdAt, text, user } = doc.data()
            return ({
            _id,
            createdAt: createdAt.toDate(),
            text,
            user,
          })})
        )
        saveMessages()
      });
    }
        
       return () => {
          unsubscribe();
        };
    }, [netInfo.isInternetReachable, netInfo.type, saveMessages])
  
  // gets messages from aync storage when user is offline
  const getMessages = async () => {
  try {
      let messageList = await AsyncStorage.getItem('messages') || [];
    setMessages({
      messages: JSON.parse(messageList)
    });
  } catch (error) {
    console.error(error.message)
  }
  };
  
  // eslint-disable-next-line no-unused-vars
  const deleteMessages = async() => {
  try {
    await AsyncStorage.removeItem('messages');
    this.setState({
      messages: []
    })
  } catch (error) {
    console.log(error.message);
  }
}

// saves messages in aync storage
const saveMessages = useCallback(async () => {
  try {
    await AsyncStorage.setItem('messages', JSON.stringify(messages));
  } catch (error) {
    console.error(error.message);
  }
}, [messages])

    
  const onSend = useCallback((messages = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, messages))
    const { _id, createdAt, text, user} = messages[0]

    // adds messages to cloud storage
    addDoc(collection(db, 'messages'), { _id, createdAt, text, user });
    // saves messages to async storage (for offline usage)
    saveMessages();
    }, [saveMessages]);
    
  return (
    <View style={[styles.container, {backgroundColor:  route.params.color}]}>
        <Text>Hi {username}!</Text>
        <Text>Welcome to the chat</Text>
        <GiftedChat
            inverted={true}
            renderBubble={renderBubble}
            messages={messages}
            onSend={messages => onSend(messages)}
            user={{
                _id: '1',
                name: username,
                avatar: 'https://placeimg.com/140/140/any'
            }}
      />
      {/* Avoid keyboard to overlap text messages on older Andriod versions  */}
        {Platform.OS === 'android' && <KeyboardAvoidingView behavior="height" />}
      </View>
  )
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingTop: Constants.statusBarHeight,
      backgroundColor: '#fff',
      padding: 8,
    },
    checkboxView: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      flex: 1,
    }
  });

export default Chat