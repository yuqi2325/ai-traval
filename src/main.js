import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vant/lib/index.css'

import { Tabbar, TabbarItem, NavBar, NoticeBar,Form, Field, CellGroup,Popup,Picker,Button,Loading,Icon,Empty,Tag,Collapse,CollapseItem} from 'vant';
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Tabbar);
app.use(TabbarItem);
app.use(NavBar);
app.use(NoticeBar);
app.use(Form);
app.use(Field);
app.use(CellGroup);
app.use(Popup);
app.use(Picker);
app.use(Button);
app.use(Loading);
app.use(Icon);
app.use(Empty);
app.use(Tag);
app.use(Collapse);
app.use(CollapseItem);
app.mount('#app')
