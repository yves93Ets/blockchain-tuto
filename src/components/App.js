import React, { Component } from 'react';
import './App.css';
import Decentragram from '../abis/Decentragram.json'
import Web3 from 'web3';
import Navbar from './Navbar'
import Main from './Main'
import detectEthereumProvider from '@metamask/detect-provider';

//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }) // leaving out the arguments will default to these values

class App extends Component {
  async  componentWillMount() {
    this.loadProvider()
  }
  async loadProvider() {
    const provider = await detectEthereumProvider();
    if (provider) {
      this.loadBlockchainData(); // initialize your app
    } else {
      console.log('Please install MetaMask!');
    }
  }

  async loadBlockchainData(){
    const {ethereum} = window
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    const netWorkId = await ethereum.request({ method: 'net_version' })
    const netWorkData = await Decentragram.networks[netWorkId]

    if (netWorkData){
      const web3 = new Web3(window.web3.currentProvider)
      const decentragram = await web3.eth.Contract(Decentragram.abi,netWorkData.address)
      const imageCount = await decentragram.methods.imageCount().call()
      this.setState({account: accounts[0],decentragram,imageCount,loading:false})

      for (let i = 1; i<= imageCount; i++){
        const image = await decentragram.methods.images(i).call()
        this.setState({images:[...this.state.images,image]})
        this.setState({images:this.state.images.sort((a,b) => b.tipAmount - a.tipAmount)})
      }
    }else{
      window.alert("Not deployed")
    }
  }

  captureFile = event => {
    event.preventDefault()
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)

    reader.onloadend = () => {
      this.setState({buffer:Buffer(reader.result)})
    }
  }

  uploadImage = description => {
    //adding file to the IPFS
    ipfs.add(this.state.buffer, (error, result) => {
      if(error) {
        console.error(error)
        return
      }

        this.setState({ loading: true })
        this.state.decentragram.methods.uploadImage(result[0].hash, description).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  tipImageOwner = (id, tipAmount) => {
        this.setState({ loading: true })
        this.state.decentragram.methods.tipImageOwner(id).send({ from: this.state.account, value: tipAmount }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
    })
  }
  constructor(props) {
    super(props)
    this.state = {
      account: '',
      decentragram:null,
      images:[],
      imageCount:0,
      loading:true,
      buffer:''
    }
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              images={this.state.images}
              captureFile={this.captureFile}
              uploadImage={this.uploadImage}
              tipImageOwner={this.tipImageOwner}
            />
        }
      </div>
    );
  }
}

export default App;