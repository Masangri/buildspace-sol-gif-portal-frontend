import React, { useEffect, useState } from 'react';

import twitterLogo from './assets/twitter-logo.svg';
import './App.css';

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

import idl from './idl.json';
import kp from './keypair.json';
import { render } from '@testing-library/react';

require('dotenv').config();

// SystemProgram is a reference to the Solana runtime
const { SystemProgram, Keypair } = web3;

// Set BaseAccount from KeyPair generated with ./createKeyPair.js
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
let baseAccount = Keypair.fromSecretKey(secret);

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
      setInputValue('');
      console.log('Gif link:', inputValue);

      try {
        const provider = getProvider();
        const program = new Program(idl, programID, provider);

        await program.rpc.addGif(
          inputValue,
          {
            accounts: {
              baseAccount: baseAccount.publicKey,
              user: provider.wallet.publicKey,
            },
          }
        );
        console.log(`GIF (${inputValue}) successfully sent to program`);
        await getGifList();
      //
      } catch (error) {
        console.log('Error sending GIF:', error);
      }

    } else {
      console.log('Invalid link');
    }
  }

  /* */
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
                  <div className="gif-item-text">
                    <p>Submitted by:</p>
                    <p>{item.userAddress.toString()}</p>
                  </div>
                  <div>
                    <button className='cta-button gif-item-vote' onClick={() => voteForGif(index, true)}>👍</button>
                    <button className='cta-button gif-item-vote' onClick={() => voteForGif(index, false)}>👎</button>
                    <h3 className='gif-item-vote-text'>Score: {Number(item.score)} </h3>
                  </div>
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
  const voteForGif = async (gifItemIndex, gifItemAction) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      console.log(gifItemAction ? 'Upvoting' : 'Downvoting', `GIF at index ${gifItemIndex}`);
      await program.rpc.gifVote(
        gifItemIndex,
        gifItemAction,
        {
          accounts: {
            baseAccount: baseAccount.publicKey,
            user: provider.wallet.publicKey,
          }
        }
      )
      await getGifList();
      render();

    //
    } catch (error) {
      console.error('Error voting on GIF:', error);
    }
  }

  /* */
  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching gif list...');
      getGifList();
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
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
