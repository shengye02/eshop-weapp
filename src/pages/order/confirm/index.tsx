import Taro, { useEffect, useState } from "@tarojs/taro";
import { View, Text, Image, ScrollView } from "@tarojs/components";
import { connect } from "@tarojs/redux";
import "./index.scss";

import * as R from "ramda";
import { CCardLite, CPrice } from "@/components/";
import HomeIcon from "./shop.svg";

import {
  ICalcResult,
  ICalcFreight,
  IStoreInfo,
  IBuyData,
  calcFreight,
  step2Order,
  IBooking,
  IBuyGoodsItemVoList,
  IOrderAddress,
  step1Detail,
  calcFee,
  getShoppingCartAxiosParam,
  getPreOrder,
  getFlatBooking,
  IBookingDetail,
  InvoiceType,
} from "@/utils/cartDb";

import fail from "@/components/Toast/fail";

import useFetch from "@/components/hooks/useFetch";
import { API } from "@/utils/setting";

import {
  handleAddressList,
  IADDRESS,
  IModPanelItem,
} from "@/pages/user/address/lib";
import AddressPanel from "./components/AddressPanel";

const OrderConfirm = ({ currentAddress }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [invalid, setInvalid] = useState(false);
  const [isInited, setIsInited] = useState<boolean>(false);
  const [amount, setAmount] = useState<ICalcResult>(null);

  const [freight, setFreight] = useState<ICalcFreight>({});
  const [invoice, setInvoice] = useState<InvoiceType>({
    type: "电子发票",
    title: "个人",
    username: "个人",
    sn: "",
    content: "明细",
    mount: 0,
    email: "",
  });
  const [origin, setOrigin] = useState<IBooking>();
  const [selectedAddr, setSelectedAddr] = useState<number>(0);

  const calc = (
    goods?: IBuyGoodsItemVoList[],
    addr?: Partial<IOrderAddress>
  ) => {
    let data = goods || goodsList;
    let _addr = addr || address;

    if (!data || !_addr || !_addr.address_id) {
      return;
    }

    let preOrder = getPreOrder({
      data,
      address: { addressId: _addr.address_id },
    });
    setLoading(true);
    if (preOrder) {
      calcFee(preOrder)
        .then((a) => {
          setLoading(false);
          setAmount(a);
        })
        .catch((e) => {
          fail(e.message);
        });

      calcFreight(preOrder).then((f) => {
        setLoading(false);
        setFreight(f);
      });
    }
  };

  const { data: address, reFetch: refreshAddress, setData } = useFetch<
    IModPanelItem
  >({
    param: {
      method: "post",
      url: API.MEMBER_ADDRESS_LIST as string,
    },
    callback: (res: { addressList: IADDRESS[] }) => {
      let resdata: IModPanelItem[] = handleAddressList(res);
      let dist = resdata.filter((item) => item.isDefault)[0];
      if (!dist) {
        dist = resdata[0] || null;
      }
      return dist;
    },
  });

  useEffect(() => {
    if (!currentAddress.address_id) {
      return;
    }
    setData(currentAddress);
    setSelectedAddr(currentAddress.addressId || 0);
  }, [JSON.stringify(currentAddress)]);

  const [goodsList, setGoodsList] = useState<IBuyGoodsItemVoList[]>([]);

  useEffect(() => {
    setLoading(true);
    let params = getShoppingCartAxiosParam();
    // console.log(params);
    setInvalid(!params);
    if (!params) {
      return;
    }

    setIsInited(true);
    step1Detail(params as IBookingDetail)
      .then((data: IBooking) => {
        let _data = R.clone(data);
        Reflect.deleteProperty(_data, "buyStoreVoList");
        setOrigin(_data);
        setSelectedAddr(_data.address ? _data.address.addressId || 0 : 0);
        let flatGoods = getFlatBooking(data) || [];
        setGoodsList(flatGoods);
        setLoading(false);
      })
      .catch((err) => {
        fail(`出错啦：${err.message}！`);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!goodsList || !address) {
      return;
    }
    calc();
  }, [goodsList, address]);

  console.log(amount);

  return (
    <View className="order_confirm">
      <ScrollView scrollY className="goods_list">
        <AddressPanel data={address} />
        {amount &&
          amount.storeList.map((item: IBuyGoodsItemVoList) => (
            <CCardLite className="goodslist" key={item.commonId}>
              <View className="shop">
                <Image src={HomeIcon} className="icon" />
                <Text className="title">{item.storeName}</Text>
              </View>

              <View className="item">
                {item.buyGoodsItemVoList.map((goods) => (
                  <View className="main" key={goods.commonId}>
                    <Image src={goods.imageSrc} className="img" />
                    <View className="detail">
                      <View className="main">
                        <Text className="goods_name">
                          {goods.goodsName} aasd
                        </Text>
                        <CPrice retail={goods.goodsPrice} />
                      </View>

                      <View className="sub">
                        <Text>{goods.goodsFullSpecs}</Text>
                        <Text>
                          x {goods.spuBuyNum}
                          {goods.unitName}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                <View className="splitLine" />
                <View className="count">
                  <View style={{ marginRight: "5px" }}>
                    共计{item.buyGoodsItemVoList.length}件, 合计
                  </View>
                  <CPrice retail={item.buyAmount0} />
                </View>
              </View>
            </CCardLite>
          ))}

        <View className="invoice">
          <View>配送方式</View>
          {!R.isNil(freight.freightAmount) && (
            <View>
              快递:
              {freight.freightAmount == 0
                ? "免邮"
                : "￥" + freight.freightAmount}
              <Text className="at-icon item-extra__icon-arrow at-icon-chevron-right" />
            </View>
          )}
        </View>

        <View className="invoice">
          <View>发票</View>
          <View>{invoice.title}</View>
        </View>
      </ScrollView>
      {amount && (
        <View className="pay">
          <CPrice
            retail={amount.buyGoodsItemAmount}
            retailStyle={{ color: "#2c2e36", fontSize: "22px", width: "unset" }}
          />
          <View className="btn" style={{ marginLeft: "10px" }}>
            确认支付
          </View>
        </View>
      )}
    </View>
  );
};

OrderConfirm.config = {
  navigationBarTitleText: "订单确认",
};

export default connect(({ order: { currentAddress } }) => ({
  currentAddress,
}))(OrderConfirm as any);
