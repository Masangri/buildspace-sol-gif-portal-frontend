import React, { useEffect, useState } from 'react';

import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import userEvent from '@testing-library/user-event';

require('dotenv').config();

// Constants
const TWITTER_HANDLE = process.env.REACT_APP_TWITTER_HANDLE;
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
  'https://c.tenor.com/wO-oCQAq6psAAAAS/zoro.gif',
  'https://c.tenor.com/7i87Qy7soqUAAAAC/luffy-one-piece.gif',
  'https://c.tenor.com/G5gutV4IqGAAAAAd/sanji-eneru.gif'
]

const App = () => {
  // State
  const [gifList, setGifList] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [walletAddress, setWalletAddress] = useState(null);

  /*
  This function holds the logic for connecting to the user's Solana Phantom wallet
  */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found');

          /*
          Connect directly with the user's wallet
          */
          await solana.connect({ onlyIfTrusted: true })
          .then((response) => {
            console.log(
              'Connected to public key:',
              response.publicKey.toString()
            );
            setWalletAddress(response.publicKey.toString());
          })
        }
      } else {
        alert('Solana object not found! Please install the Phantom wallet👻 extension');
      }
    } catch (error) {
      console.error(error);
    }
  }

  /*
  */
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      await solana.connect()
      .then((response) => {
        console.log(
          'Connected to public key:',
          response.publicKey.toString()
        );
        setWalletAddress(response.publicKey.toString());
      })
    }
  };

  /**/
  const sendGif = () => {
    if (inputValue.length > 0) {
      console.log('Gif link:', inputValue);
      setGifList([...gifList, inputValue]);
      setInputValue('');
    } else {
      console.log('Invalid link');
    }
  }

  /*
  */
 const onInputChange = (event) => {
   setInputValue(event.target.value);
 }

  /*
  Unconnected component
  */
  const renderNotConnectedContainer = () => {
    return (
      <button
        className="cta-button connect-wallet-button"
        onClick={connectWallet}
      >
        Connect to Wallet
      </button>
    )
  }

  /* Connected component */
  const renderConnectedContainer = () => {
    return (
      <div className='connected-container'>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}
        >
          <input
            type='text'
            placeholder='Enter link to gif'
            value={inputValue}
            onChange={onInputChange}
          />
          {!inputValue && <button type='submit' className='cta-button submit-gif-button' disabled>Submit</button>}
          {inputValue && <button type='submit' className='cta-button submit-gif-button'>Submit</button>}
        </form>
        <div className='gif-grid'>
          {gifList.map((gif) => {
            return (
              <div className='gif-item' key={gif}>
                <img src={gif} alt={gif} />
              </div>
            )
          })}
        </div>
      </div>
    )
  };

  /*
  When our component first mounts, let's check to see if Phantom is connected
  */
  useEffect (() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  /*
  */
  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching gif list...');

      /**Call Solana program here */

      /**Set state */
      setGifList(TEST_GIFS);
    }
  }, [walletAddress])

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">One Piece 🏴‍☠️ GIF Portal</p>
          <p className="sub-text">
            View Your GIF Collection in the Metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
