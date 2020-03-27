import Taro, { useRouter, useState, useEffect } from "@tarojs/taro";
import { View, Image, Text } from "@tarojs/components";
import "./index.scss";
import Tab from "@/pages/search/tab/";
import * as db from "./db";
import ListView from "taro-listview";
import useSetState from "@/components/hooks/useSetState";
import useFetch from "@/components/hooks/useFetch";
import useLogin from "@/components/hooks/useLogin";
import HomeIcon from "@/pages/order/confirm/shop.svg";
import classnames from "classname";
import { ORDER } from "@/utils/api";
import CancelOrder from "./components/CancelOrder";
import EditAddr from "./components/EditAddr";
import Refund from "./components/Refund";
import Pay from "./components/Pay";
import Receive from "./components/Receive";

import Rebuy from "./components/Rebuy";

import CountTime from "./components/CountTime";
const { EOrderStatus } = db;

const Comment = () => {
  let isLogin = useLogin();
  const router = useRouter();

  const [current, setCurrent] = useState(router.params.state || 0);

  useEffect(() => {
    if ("undefined" == typeof router.params.state) {
      return;
    }
    setCurrent(+router.params.state);
  }, [router.params]);

  const [page, setPage] = useState(1);

  const [state, setState] = useSetState({
    isLoaded: true,
    hasMore: false,
    list: []
  });

  const { loading, reFetch } = useFetch({
    param: {
      ...ORDER.list,
      params: {
        ordersState: ["all", "new", "pay", "send", "noeval", "cancel"][current], //全部订单
        ordersType: db.EOrderTypes.real, // 实物订单
        keyword: "" // 搜索关键词 订单号或商品
      }
    },
    callback: (e: {
      pageEntity;
      ordersPayVoList: db.IOrderItem[];
      [key: string]: any;
    }) => {
      let { hasMore } = e.pageEntity;
      let list = db.convertOrderData(e.ordersPayVoList);
      setState({
        hasMore,
        list,
        isLoaded: page === 1
      });
    },
    valid: () => isLogin
  });

  // 更新cat信息
  const handleMenu = index => {
    setCurrent(index);
  };

  const getData = async (pageIndex = page) => {
    if (pageIndex === 1) {
      setState({ isLoaded: false });
    }
    const {
      data: { data }
    } = await Taro.request({
      url: "https://cnodejs.org/api/v1/topics",
      data: {
        limit: 10,
        page: pageIndex
      }
    });
    return { list: data, hasMore: true, isLoaded: pageIndex === 1 };
  };

  const onScrollToLower = async fn => {
    const { list } = state;
    const { list: newList, hasMore } = await getData(page + 1);
    setPage(page + 1);
    setState({
      list: list.concat(newList),
      hasMore
    });
    fn();
  };

  const onRefresh = () => {
    reFetch();
    console.log("刷新数据");
  };

  // console.log(state);

  return (
    <View className="user_order">
      <Tab list={db.orderStateList} current={current} onChange={handleMenu} />
      <ListView
        lazy=".lazy-view"
        isLoaded={state.isLoaded}
        hasMore={state.hasMore}
        style={{ height: "calc(100% - 40px)", background: "#f8f8f8" }}
        onScrollToLower={onScrollToLower}
        onPullDownRefresh={onScrollToLower}
        className="order_detail"
      >
        {state.list.map(order => {
          return (
            <View className="at-list" key={order.payId}>
              <View className="header">
                <View className="shop">
                  <Image src={HomeIcon} className="icon" />
                  <Text className="title">{order.shop}</Text>
                </View>
                <View className="status">{order.statusName}</View>
              </View>

              {order.goods.map((goodsItem, idx) => (
                <View
                  className={classnames("at-list__item at-list__item--thumb", {
                    noBorder: idx === order.goods.length - 1
                  })}
                  key={goodsItem.goodsId}
                >
                  <View className="at-list__item-container">
                    <View className="at-list__item-thumb">
                      <Image
                        mode="scaleToFill"
                        className="item-thumb"
                        src={goodsItem.url}
                      />
                    </View>

                    <View className="at-list__item-content item-content">
                      <View className="item-content__info">
                        <View className="item-content__info-title spaceBetween">
                          <Text>{goodsItem.title}</Text>
                          <Text>￥{goodsItem.price}</Text>
                        </View>
                        <View className="item-content__info-subtitle spaceBetween">
                          <Text>{goodsItem.type}</Text>
                          <Text>× {goodsItem.count}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              <View className="footer">
                <Text>
                  运费：{"￥" + order.express || "包邮"}，共{order.goods.length}
                  件商品
                </Text>
                <Text className="payAmount">实付：￥{order.payAmount}</Text>
              </View>

              {[EOrderStatus.sending, EOrderStatus.needPay].includes(
                order.status
              ) && (
                <View className="closeTime">
                  <CountTime time={order.autoCancelTime} />
                </View>
              )}

              <View className="action">
                {/* 取消订单 */}
                {[EOrderStatus.needPay].includes(order.status) && (
                  <CancelOrder orderId={order.orderId} onRefresh={onRefresh} />
                )}

                {/* 地址编辑 */}
                {[EOrderStatus.needPay].includes(order.status) && (
                  <EditAddr orderId={order.orderId} onRefresh={onRefresh} />
                )}

                {/* 退款 */}
                {(!order.refund || order.refund.length === 0) &&
                  [EOrderStatus.payed].includes(order.status) && (
                    <Refund orderId={order.orderId} onRefresh={onRefresh} />
                  )}

                {/* 去付款 */}
                {[EOrderStatus.needPay].includes(order.status) && (
                  <Pay orderId={order.orderId} onRefresh={onRefresh} />
                )}

                {/* 确认收货 */}
                {[EOrderStatus.sending].includes(order.status) && (
                  <Receive orderId={order.orderId} onRefresh={onRefresh} />
                )}

                {/* 已完成、已评价、已追评、已关闭 */}
                {[
                  EOrderStatus.complete,
                  EOrderStatus.commented,
                  EOrderStatus.appendCommented,
                  EOrderStatus.closed
                ].includes(order.status) &&
                  order.ordersTypeName !== "特品" && (
                    <Rebuy goods={order.goods} />
                  )}
              </View>
            </View>
          );
        })}
      </ListView>
    </View>
  );
};

Comment.config = {
  navigationBarTitleText: "我的评价"
};

export default Comment;
