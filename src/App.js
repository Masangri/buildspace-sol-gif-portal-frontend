import React, { useEffect, useState } from 'react';

import twitterLogo from './assets/twitter-logo.svg';
import './App.css';

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

import idl from './idl.json';

require('dotenv').config();

// SystemProgram is a reference to the Solana runtime
const { SystemProgram, Keypair } = web3;

// Create a Keypair for the account that will hold the GIF data
let baseAccount = Keypair.generate();

// Get out Solana program's ID from the IDL file
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet
const network = clusterApiUrl('devnet');

//Controls how we want to acknowledge when a transaction is "done"\
const opts = {
  preflightCommitment: 'processed'
};

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
  const sendGif = async () => {
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

  /* Get Provider */
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  /* */
  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log('ping');

      // Init program\
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log('Created a new BaseAccount with address:', baseAccount.publicKey.toString());
      await getGifList();
    } catch (error) {
      console.error('Error creating BaseAccount account', error);
    }
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
    // If we hit this, it means the program hasn't been initialized with the BaseAccount
    // (since BaseAccount is generated from a different keypair every time the web app is launched...)
    if (gifList === null) {
      return (
        <div className='connected-container'>
          <button className='cta-button submit-gif-button' onClick={createGifAccount}>
            Initialize GIF Program Account(one-time requirement)
          </button>
        </div>
      )
    //Otherwise, account exists. User can submit GIFs to GifList
    } else {
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
            {gifList.map((item, index) => {
              return (
                <div className='gif-item' key={index}>
                  <img src={item.gifLink} alt={item.gifLink} />
                </div>
              )
            })}
          </div>
        </div>
      )
    }
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

  /* */
  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log('Retrieved the account:', account);
      setGifList(account.gifList);
    } catch (error) {
      console.error('Error in getGifList:', error);
      setGifList(null);
    }
  }

  /* */
  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching gif list...');
      getGifList();

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
